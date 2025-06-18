let deck, player, dealer, gameOver;
let wins = 0, losses = 0;
let bankroll = 1000;
let handCount = 0;
const maxHands = 5;
let currentBet = 0;
let playerName = "";

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

function startGame() {
  if (playerName === "") {
    playerName = prompt("Enter your name:");
    if (!playerName) {
      alert("Name required to play.");
      return;
    }
    document.getElementById("player-name").textContent = `Player: ${playerName}`;
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
