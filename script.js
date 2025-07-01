let deck, player, dealer, gameOver;
let wins = 0, losses = 0;
let bankroll = 1000;
let handCount = 0;
const maxHands = 5;
let currentBet = 0;
let playerName = "";

const SUPABASE_URL = "https://nrbrprhyfwoxgccufpfu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yYnJwcmh5ZndveGdjY3VmcGZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzODU0NzIsImV4cCI6MjA2Njk2MTQ3Mn0.dOc1QCHD88sBN9SiY7mmNNWg5gkjqgI7UVMN5wo-dM0";
const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json"
};

let playerId = null;
let sessionStartTime = null;


const playAgainButton = document.getElementById("play-again-button");

function createDeck() {
  const suits = ["S", "H", "D", "C"];
  const values = [
    "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"
  ];
  const deck = [];
  for (let suit of suits) {
    for (let value of values) {
      deck.push({ suit, value });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

function getValue(card) {
  if (card.value === "A") return 11;
  if (["K", "Q", "J"].includes(card.value)) return 10;
  return parseInt(card.value);
}

function getHandValue(hand) {
  let value = 0, aces = 0;
  for (let card of hand) {
    value += getValue(card);
    if (card.value === "A") aces++;
  }
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  return value;
}

function getCardImageUrl(card) {
  let value = card.value;
  if (value === "10") value = "0"; // API quirk: 10 → '0'
  return `https://deckofcardsapi.com/static/img/${value}${card.suit}.png`;
}

function renderHand(hand, elementId, hideSecond = false) {
  const container = document.getElementById(elementId);
  container.innerHTML = "";
  hand.forEach((card, idx) => {
    const img = document.createElement("img");
    img.className = "card-img";
    if (hideSecond && idx === 1) {
      img.src = "https://deckofcardsapi.com/static/img/back.png";
    } else {
      img.src = getCardImageUrl(card);
    }
    container.appendChild(img);
  });

  if (!(hideSecond && elementId === "dealer-hand")) {
    const val = getHandValue(hand);
    const valDiv = document.createElement("div");
    valDiv.textContent = `(${val})`;
    container.appendChild(valDiv);
  }
}

async function startGame() {
  if (playerName === "") {
    playerName = prompt("Enter your name:");
    if (!playerName) {
      alert("Name required to play.");
      return;
    }
    document.getElementById("player-name").textContent = `Player: ${playerName}`;
    await getOrCreatePlayer(playerName.toLowerCase());
  }

  if (bankroll <= 0 || handCount >= maxHands) {
    alert(`Game over! Final bankroll: $${bankroll}`);
    return;
  }

  currentBet = parseInt(prompt(`You have $${bankroll}. Enter your bet:`), 10);
  if (isNaN(currentBet) || currentBet <= 0 || currentBet > bankroll) {
    alert("Invalid bet amount. Try again.");
    return;
  }

  sessionStartTime = new Date().toISOString();

  deck = createDeck();
  player = [deck.pop(), deck.pop()];
  dealer = [deck.pop(), deck.pop()];
  gameOver = false;
  document.getElementById("result").textContent = "";
  renderHand(player, "player-hand");
  renderHand(dealer, "dealer-hand", true);
  updateScore();
}

function hit() {
  if (gameOver) return;
  player.push(deck.pop());
  renderHand(player, "player-hand");
  if (getHandValue(player) > 21) {
    losses++;
    bankroll -= currentBet;
    handCount++;
    endGame("You busted!");
  }
}

function stand() {
  if (gameOver) return;
  while (getHandValue(dealer) < 17) {
    dealer.push(deck.pop());
  }
  const playerVal = getHandValue(player);
  const dealerVal = getHandValue(dealer);
  let message;

  if (dealerVal > 21 || playerVal > dealerVal) {
    wins++;
    bankroll += currentBet;
    message = `You win $${currentBet}!`;
  } else if (dealerVal === playerVal) {
    message = "Push!";
  } else {
    losses++;
    bankroll -= currentBet;
    message = `Dealer wins. You lose $${currentBet}.`;
  }

  handCount++;
  endGame(message);
}

function endGame(message) {
  gameOver = true;
  renderHand(dealer, "dealer-hand");
  document.getElementById("result").textContent = message;
  updateScore();

  if (bankroll <= 0 || handCount >= maxHands) {
    setTimeout(() => {
      alert(`Game over! Final bankroll: $${bankroll}`);
      console.log("Sending history:", {
        playerName,
        wins,
        losses,
        finalBankroll: bankroll,
        totalHands: handCount
      });
      playAgainButton.style.display = "inline-block";
    }, 100);
  }

  if (bankroll <= 0 || handCount >= maxHands) {
    setTimeout(async () => {
      alert(`Game over! Final bankroll: $${bankroll}`);
      console.log("Sending history to Supabase…");

      const sessionEndTime = new Date().toISOString();

      await fetch(`${SUPABASE_URL}/rest/v1/sessions`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({
          player_id: playerId,
          start_time: sessionStartTime,
          end_time: sessionEndTime,
          final_bankroll: bankroll,
          hands_played: handCount,
          wins: wins,
          losses: losses
        })
      });

      // Update player stats
      await fetch(`${SUPABASE_URL}/rest/v1/players?player_id=eq.${playerId}`, {
        method: "PATCH",
        headers: HEADERS,
        body: JSON.stringify({
          total_sessions: wins + losses > 0 ? 1 : 0, // assume 1 session only if played
          total_hands: handCount,
          total_wins: wins,
          total_losses: losses,
          last_session_at: sessionEndTime
        })
      });

      playAgainButton.style.display = "inline-block";
    }, 100);
  }

}

function resetGame() {
  bankroll = 1000;
  handCount = 0;
  wins = 0;
  losses = 0;
  playAgainButton.style.display = "none";
  document.getElementById("result").textContent = "";
  updateScore();
}

function updateScore() {
  document.getElementById("score").textContent =
    `Bankroll: $${bankroll} | Wins: ${wins} | Losses: ${losses} | Hand ${handCount}/${maxHands}`;
}

async function getOrCreatePlayer(name) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/players?name=eq.${name}`, { headers: HEADERS });
  const existing = await res.json();

  if (existing.length > 0) {
    console.log("Existing player found:", existing);
    playerId = existing[0].player_id;
  } else {
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/players`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        name: name,
        total_sessions: 0,
        total_hands: 0,
        total_wins: 0,
        total_losses: 0,
        last_session_at: new Date().toISOString()
      })
    });
    const inserted = await insertRes.json();
    console.log("New player created:", inserted);
    playerId = inserted[0].player_id;
  }
}
