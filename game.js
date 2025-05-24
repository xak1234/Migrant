// --- Firebase Configuration ---
const userProvidedFirebaseConfig = {
    apiKey: "AIzaSyARzlfhH_AC0YTxJ5fKvhz_SPDq1r6mWPA",
    authDomain: "migrantopoly.firebaseapp.com",
    projectId: "migrantopoly",
    storageBucket: "migrantopoly.firebasestorage.app",
    messagingSenderId: "649348280586",
    appId: "1:649348280586:web:2bd3be4d2de84c0ea8caf3",
    measurementId: "G-1TMRSC6KL8"
};
// Use global config if available, otherwise fallback to userProvided (or your defaults)
const firebaseConfigToUse = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : userProvidedFirebaseConfig;

const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Firebase SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, collection, serverTimestamp, arrayUnion, arrayRemove, runTransaction, writeBatch, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js"; // Analytics can be added if needed

let db, auth, currentUserId = null, localPlayerName = '';
let currentGameId = null;
let unsubscribeGameState = null;
let localGameData = {}; // Local cache of the game state
// let analytics; // Declare analytics if you plan to use it

// --- DOM Elements ---
const onlineSetupScreen = document.getElementById('online-setup-screen');
const gameContainer = document.getElementById('game-container');
const playerNameInput = document.getElementById('player-name-input');
const gameIdInput = document.getElementById('game-id-input');
const createGameButton = document.getElementById('create-game-button');
const joinGameButton = document.getElementById('join-game-button');
const numHumanPlayersSelect = document.getElementById('num-human-players-select');
const numAIPlayersSelect = document.getElementById('num-ai-players-select'); // Added for AI
const onlineSetupMessage = document.getElementById('online-setup-message');
const gameIdDisplayDiv = document.getElementById('game-id-display');
const generatedGameIdSpan = document.getElementById('generated-game-id');
const localUserIdSpan = document.getElementById('local-user-id');

const boardContainer = document.getElementById('board-container');
const playerInfoDiv = document.getElementById('player-info');
const rollDiceButton = document.getElementById('roll-dice-button');
const endTurnButton = document.getElementById('end-turn-button');
const buyPropertyButton = document.getElementById('buy-property-button');
const buyPropertyPriceSpan = document.getElementById('buy-property-price');
const developPropertyButton = document.getElementById('develop-property-button');
const diceFace1Elem = document.getElementById('die-face-1');
const diceFace2Elem = document.getElementById('die-face-2');
const diceTotalDisplayText = document.getElementById('dice-total-display-text');
const currentTurnDisplay = document.getElementById('current-turn-display');
const cardDisplayContainer = document.getElementById('card-display-container');
const cardTypeTitle = document.getElementById('card-type-title');
const cardMessageP = document.getElementById('card-message');
const cardOkButton = document.getElementById('card-ok-button');
const detentionActionsDiv = document.getElementById('detention-actions');
const gameStatusMessageP = document.getElementById('game-status-message');
const preGameRollArea = document.getElementById('pre-game-roll-area');
const preGameRollButton = document.getElementById('pre-game-roll-button');
const preGameRollResultsDiv = document.getElementById('pre-game-roll-results');
const developPropertyContainer = document.getElementById('develop-property-container');
const developPropertyNameH3 = document.getElementById('develop-property-name');
const developPropertyOptionsDiv = document.getElementById('develop-property-options');
const closeDevelopButton = document.getElementById('close-develop-button');
const otherActionsContainer = document.getElementById('other-actions-container');
const ukGovCashSpan = document.getElementById('uk-gov-cash');
let onBoardCardDisplayDiv, onBoardCardTypeH4, onBoardCardTextP, onBoardCardOkButton;

const messageModal = document.getElementById('message-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalOkButton = document.getElementById('modal-ok-button');
const moneyFlashDiv = document.getElementById('money-flash');
const rentFlashDiv = document.getElementById('rent-flash');


// --- Game Data Definitions ---
let initialBoardLayout = [ // This layout will be reformatted
    { id: 0, name: "Dole", type: "go" },
    { id: 1, name: "Tent in Field 1", type: "property", price: 60, rent: [4, 20, 60, 180, 320, 450], color: "brown", groupId: "brown", houseCost: 50 },
    { id: 2, name: "Welfare Card", type: "welfare" },
    { id: 3, name: "Tent in Field 2", type: "property", price: 80, rent: [8, 40, 100, 300, 450, 600], color: "brown", groupId: "brown", houseCost: 50 },
    { id: 4, name: "Black Market Sales", type: "set_property", price: 200, rent_base: 150, groupId: "special_set" },
    { id: 5, name: "Fake PIP declined", type: "tax", amount: 100 },
    { id: 6, name: "Tesco Cardboard Skip 1", type: "property", price: 100, rent: [6, 30, 90, 270, 400, 550], color: "light-blue", groupId: "lightblue", houseCost: 50 },
    { id: 7, name: "Tesco Cardboard Skip 2", type: "property", price: 120, rent: [8, 40, 100, 300, 450, 600], color: "light-blue", groupId: "lightblue", houseCost: 50 },
    { id: 8, name: "Detention Center", type: "detention_visiting" },
    { id: 9, name: "Payout: Job Seeker's", type: "payout", amount: 100 },
    { id: 10, name: "Tesco Cardboard Skip 3", type: "property", price: 140, rent: [10, 50, 150, 450, 625, 750], color: "light-blue", groupId: "lightblue", houseCost: 50 },
    { id: 11, name: "Council Highrise 1", type: "property", price: 160, rent: [12, 60, 180, 500, 700, 900], color: "pink", groupId: "pink", houseCost: 100 },
    { id: 12, name: "Forced Marriage", type: "set_property", price: 200, rent_base: 150, groupId: "special_set" },
    { id: 13, name: "Welfare Card", type: "welfare" },
    { id: 14, name: "Council Highrise 2", type: "property", price: 180, rent: [14, 70, 200, 550, 750, 950], color: "pink", groupId: "pink", houseCost: 100 },
    { id: 15, name: "Council Highrise 3", type: "property", price: 200, rent: [16, 80, 220, 600, 800, 1000], color: "pink", groupId: "pink", houseCost: 100 },
    { id: 16, name: "Crime Spree !!! Arrest", type: "crime_spree", amount: 150 },
    { id: 17, name: "Gypsy Estate 1", type: "property", price: 220, rent: [18, 90, 250, 700, 875, 1050], color: "orange", groupId: "orange", houseCost: 150 },
    { id: 18, name: "Opportunity Card", type: "opportunity" },
    { id: 19, name: "Gypsy Estate 2", type: "property", price: 240, rent: [20, 100, 300, 750, 925, 1100], color: "orange", groupId: "orange", houseCost: 150 },
    { id: 20, name: "Child Wives", type: "set_property", price: 200, rent_base: 150, groupId: "special_set" },
    { id: 21, name: "Fake ID Cards", type: "tax", amount: 100 },
    { id: 22, name: "Gypsy Estate 3", type: "property", price: 260, rent: [22, 110, 330, 800, 975, 1150], color: "orange", groupId: "orange", houseCost: 150 },
    { id: 23, name: "Holiday Inn 1", type: "property", price: 280, rent: [24, 120, 360, 850, 1025, 1200], color: "red", groupId: "red", houseCost: 200 },
    { id: 24, name: "Go to Detention Center", type: "go_to_detention" },
    { id: 25, name: "Welfare Card", type: "welfare" },
    { id: 26, name: "Holiday Inn 2", type: "property", price: 300, rent: [26, 130, 390, 900, 1100, 1275], color: "red", groupId: "red", houseCost: 200 },
    { id: 27, name: "Holiday Inn 3", type: "property", price: 320, rent: [28, 150, 450, 1000, 1200, 1400], color: "red", groupId: "red", houseCost: 200 },
    { id: 28, name: "I Dont speak English", type: "set_property", price: 200, rent_base: 150, groupId: "special_set" },
    { id: 29, name: "Luxury Flat 1", type: "property", price: 350, rent: [35, 175, 500, 1100, 1300, 1500], color: "green", groupId: "green", houseCost: 200 },
    { id: 30, name: "Opportunity Card", type: "opportunity" },
    { id: 31, name: "Luxury Flat 2", type: "property", price: 400, rent: [50, 200, 600, 1400, 1700, 2000], color: "green", groupId: "green", houseCost: 200 },
];
let boardLayout = []; // Will hold the final, re-indexed board layout
let detentionCenterSpaceId;
const MAX_TENANCIES_BEFORE_PR = 4;
const PR_IS_FIFTH_DEVELOPMENT = true;


const welfareCards = [
    { text: "Child Benefit: Collect £100.", action: "collect", amount: 100 },
    { text: "Free Health Service: Gain a health service (worth £100).", action: "gainHealthService" },
    { text: "Council House Grant: Collect £150.", action: "collect", amount: 150 },
    { text: "Social Worker Fee: Pay £50.", action: "pay", amount: 50 },
    { text: "Food Voucher: Collect £75.", action: "collect", amount: 75 },
    { text: "Education Grant: Collect £120.", action: "collect", amount: 120 },
    { text: "Housing Inspection: Pay £20 per tenancy/PR owned.", action: "payPerDevelopment", amountPerTenancy: 20, amountPerPR: 100 },
    { text: "Utility Subsidy: Collect £80.", action: "collect", amount: 80 },
    { text: "Legal Aid: Get out of Detention Center free.", action: "getOutOfDetentionFree" },
    { text: "Emergency bowels: Collect £100.", action: "collect", amount: 100 },
    { text: "Tax Audit: Pay £60.", action: "pay", amount: 60 },
    { text: "Welfare Review: Move to nearest Payout Space.", action: "moveToNearestPayout" }
];
const opportunityCards = [
    { text: "Work Permit Granted: Collect £150.", action: "collect", amount: 150 },
    { text: "Language Subsidy: Collect £50.", action: "collect", amount: 50 },
    { text: "Community Grant: Collect £100.", action: "collect", amount: 100 },
    { text: "Deportation Threat: Go to Detention Center. Do not pass Dole. Do not collect £200.", action: "goToDetentionDirect" },
    { text: "Legal Homosexuals: Get out of Detention Center free.", action: "getOutOfDetentionFree" },
    { text: "Job Offer: Collect £120.", action: "collect", amount: 120 },
    { text: "Housing Voucher: Next estate purchase is 25% off.", action: "housingVoucher" },
    { text: "Free Health Service: Gain a health service (worth £100).", action: "gainHealthService" },
    { text: "Bank Manager Shat His Load: Pay £50 to the bank.", action: "pay", amount: 50 },
    { text: "Tax Refund: Collect £75.", action: "collect", amount: 75 },
    { text: "Dogs Had An Abortion: Collect £40 from each player.", action: "collectFromPlayers", amount: 40 },
    { text: "Advance to Dole: Collect £400.", action: "advanceToGo" }
];
const playerEmojis = ['🐕‍🦺', '🐈', '🐘', '🐅', '🐒', '🦊'];
const playerColors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c'];

let toneSynth;
let audioContextStarted = false;

// --- Global state for property swap ---
if (!window._propertySwapState) {
    window._propertySwapState = {
        cardA: null,                 // { playerId, propId } - Initiator's card
        cardB: null,                 // { playerId, propId } - Target's card
        swapInitiatorPlayerId: null, // UID of the player who started the swap
        swapActive: false,           // True when a proposal is made (cardA and cardB selected)
        swapTimeout: null            // Stores setTimeout ID for timeouts
    };
}

// --- Utility Functions ---
function logEvent(message, data = null) {
    if (data) {
        console.log(`[Game Log] ${new Date().toLocaleTimeString()}: ${message}`, data);
    } else {
        console.log(`[Game Log] ${new Date().toLocaleTimeString()}: ${message}`);
    }
}

function showMessageModal(title, message) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    messageModal.style.display = 'flex';
}
modalOkButton.onclick = () => {
    messageModal.style.display = 'none';
};

function generateGameId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function reformatBoardLayout() {
    const newBoardLocations = [
        { name: "Boat Sank After Renting", type: "set_property", price: 100, rent_base: 150, groupId: "special_set" },
        { name: "People Trafficking", type: "set_property", price: 100, rent_base: 150, groupId: "special_set" },
        { name: "More than 15 children", type: "set_property", price: 100, rent_base: 150, groupId: "special_set" },
        { name: "Crypto Scam from Iqbhal", type: "set_property", price: 100, rent_base: 150, groupId: "special_set" }
    ];
    let tempBoard = [];
    tempBoard.push(initialBoardLayout.find(s => s.id === 0));
    const welfareCardOriginalSide1 = initialBoardLayout.find(s => s.id === 2);
    const boatSankProperty = newBoardLocations[0];
    tempBoard.push(initialBoardLayout.find(s => s.id === 1));
    tempBoard.push(boatSankProperty);
    tempBoard.push(initialBoardLayout.find(s => s.id === 3));
    tempBoard.push(initialBoardLayout.find(s => s.id === 4));
    tempBoard.push(welfareCardOriginalSide1);
    tempBoard.push(...initialBoardLayout.filter(s => s.id >= 5 && s.id <= 7));
    tempBoard.push(initialBoardLayout.find(s => s.id === 8));

    const peopleTraffickingProperty = newBoardLocations[1];
    const payoutJobSeekersOriginal = initialBoardLayout.find(s => s.id === 9);
    tempBoard.push(peopleTraffickingProperty);
    tempBoard.push(initialBoardLayout.find(s => s.id === 10));
    tempBoard.push(initialBoardLayout.find(s => s.id === 11));
    tempBoard.push(initialBoardLayout.find(s => s.id === 12));
    tempBoard.push(payoutJobSeekersOriginal);
    tempBoard.push(initialBoardLayout.find(s => s.id === 13));
    tempBoard.push(initialBoardLayout.find(s => s.id === 14));
    tempBoard.push(initialBoardLayout.find(s => s.id === 15));

    tempBoard.push(initialBoardLayout.find(s => s.id === 16));
    const moreThan15ChildrenProperty = newBoardLocations[2];
    const opportunityCardSide3Original = initialBoardLayout.find(s => s.id === 18);
    tempBoard.push(initialBoardLayout.find(s => s.id === 17));
    tempBoard.push(moreThan15ChildrenProperty);
    tempBoard.push(initialBoardLayout.find(s => s.id === 19));
    tempBoard.push(initialBoardLayout.find(s => s.id === 20));
    tempBoard.push(opportunityCardSide3Original);
    tempBoard.push(...initialBoardLayout.filter(s => s.id >= 21 && s.id <= 23));

    tempBoard.push(initialBoardLayout.find(s => s.id === 24));
    const cryptoScamProperty = newBoardLocations[3];
    const opportunityCardSide4Original = initialBoardLayout.find(s => s.id === 30);
    tempBoard.push(initialBoardLayout.find(s => s.id === 25));
    tempBoard.push(initialBoardLayout.find(s => s.id === 26));
    tempBoard.push(initialBoardLayout.find(s => s.id === 27));
    tempBoard.push(initialBoardLayout.find(s => s.id === 28));
    tempBoard.push(opportunityCardSide4Original);
    tempBoard.push(initialBoardLayout.find(s => s.id === 29));
    tempBoard.push(cryptoScamProperty);
    tempBoard.push(initialBoardLayout.find(s => s.id === 31));

    boardLayout = tempBoard.map((space, index) => ({ ...space, id: index }));

    const dcSpace = boardLayout.find(s => s.name === "Detention Center");
    detentionCenterSpaceId = dcSpace ? dcSpace.id : (boardLayout.find(s => s.type === "detention_visiting")?.id || 8);
}


// --- Firebase Setup ---
async function initializeFirebase() {
    if (!firebaseConfigToUse || !firebaseConfigToUse.apiKey || firebaseConfigToUse.apiKey === "YOUR_API_KEY" || !firebaseConfigToUse.projectId) {
        onlineSetupMessage.textContent = "Firebase configuration is missing or incomplete. Online features disabled.";
        console.error("Firebase config is not available or incomplete. Please update it in the script with your actual Firebase project details.");
        createGameButton.disabled = true;
        joinGameButton.disabled = true;
        showMessageModal("Setup Error", "Firebase is not configured. Please check the console for details. Online play is unavailable.");
        return;
    }
    try {
        const app = initializeApp(firebaseConfigToUse);
        db = getFirestore(app);
        auth = getAuth(app);

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUserId = user.uid;
                localUserIdSpan.textContent = currentUserId;
                logEvent(`Authenticated as: ${currentUserId}`);
                onlineSetupMessage.textContent = "Connected. Ready to create or join a game.";
                createGameButton.disabled = false;
                joinGameButton.disabled = false;
            } else {
                currentUserId = null;
                localUserIdSpan.textContent = "Not Signed In";
                logEvent("User is signed out or initial authentication pending.");

                if (initialAuthToken) {
                    try {
                        await signInWithCustomToken(auth, initialAuthToken);
                        logEvent("Signed in with custom token.");
                    } catch (error) {
                        console.error("Custom token sign-in error:", error);
                        logEvent("Custom token sign-in failed, trying anonymous.");
                        await signInAnonymously(auth);
                    }
                } else {
                    logEvent("No custom token, trying anonymous sign-in.");
                    await signInAnonymously(auth);
                }
            }
        });
    } catch (error) {
        console.error("Firebase initialization error:", error);
        onlineSetupMessage.textContent = "Error connecting to Firebase: " + error.message;
        showMessageModal("Firebase Error", "Could not initialize Firebase: " + error.message);
        createGameButton.disabled = true;
        joinGameButton.disabled = true;
    }
}

// --- Game Management Functions (Create, Join, Sync) ---
async function handleCreateGame() {
    if (!currentUserId) {
        showMessageModal("Error", "You are not authenticated. Please wait or refresh.");
        return;
    }
    localPlayerName = playerNameInput.value.trim() || `Player ${currentUserId.substring(0,4)}`;
    if (!localPlayerName) {
        showMessageModal("Input Needed", "Please enter your player name.");
        return;
    }

    const newGameId = generateGameId();
    currentGameId = newGameId;
    const numHumanPlayers = parseInt(numHumanPlayersSelect.value);
    const numAIPlayers = parseInt(numAIPlayersSelect.value);
    const totalPlayers = numHumanPlayers + numAIPlayers;

    if (totalPlayers < 2 || totalPlayers > 4) {
        showMessageModal("Game Size Error", "Total players (Humans + AI) must be between 2 and 4.");
        return;
    }
    if (numHumanPlayers < 1) { // Must have at least the host as a human player
        showMessageModal("Game Setup Error", "There must be at least 1 human player (the host).");
        return;
    }


    const gameDocRef = doc(db, "games", newGameId);

    reformatBoardLayout();

    const initialPropertyDataForFirestore = boardLayout
        .filter(s => s.type === 'property' || s.type === 'set_property')
        .map(p => ({
            id: p.id,
            name: p.name,
            owner: null,
            tenancies: 0,
            permanentResidence: false,
        }));


    const initialPlayerData = {
        id: currentUserId,
        name: localPlayerName,
        money: 2000,
        position: 0,
        propertiesOwned: [],
        healthServices: 0,
        getOutOfDetentionCards: 0,
        inDetention: false,
        missedTurnsInDetention: 0,
        hasHousingVoucher: false,
        isBankrupt: false,
        playerActionTakenThisTurn: false,
        doublesRolledInTurn: 0,
        order: 0,
        govReceived: 0,
        isAI: false
    };

    const initialGameState = {
        gameId: newGameId,
        status: "waiting",
        hostId: currentUserId,
        maxPlayers: totalPlayers,
        numHumanPlayers: numHumanPlayers, // Store how many human slots are expected
        players: { [currentUserId]: initialPlayerData },
        playerOrder: [currentUserId],
        currentPlayerIndex: 0,
        boardLayout: boardLayout,
        propertyData: initialPropertyDataForFirestore,
        bankMoney: 15000,
        ukGovMoney: 20000,
        shuffledWelfareCards: shuffleDeck([...welfareCards]),
        shuffledOpportunityCards: shuffleDeck([...opportunityCards]),
        welfareCardIndex: 0,
        opportunityCardIndex: 0,
        lastDiceRoll: null,
        lastActionMessage: `${localPlayerName} created the game. Waiting for players...`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        preGameRolls: {},
        preGamePlayersRolled: [],
        preGamePhase: true,
        gamePhase: "setup",
        currentCardDraw: null,
        lastRentEvent: null,
        flashingProperties: [], // ENSURE THIS IS INITIALIZED
    };

    // Add AI players immediately
    let currentOrderIndex = 1; // Host is order 0
    for (let i = 0; i < numAIPlayers; i++) {
        const aiPlayerId = `AI-${crypto.randomUUID().substring(0, 8)}`;
        const aiPlayerName = `AI Bot ${i + 1}`;
        const aiPlayerData = {
            id: aiPlayerId, name: aiPlayerName, money: 2000, position: 0, propertiesOwned: [],
            healthServices: 0, getOutOfDetentionCards: 0, inDetention: false, missedTurnsInDetention: 0,
            hasHousingVoucher: false, isBankrupt: false, playerActionTakenThisTurn: false,
            doublesRolledInTurn: 0, order: currentOrderIndex, govReceived: 0, isAI: true
        };
        initialGameState.players[aiPlayerId] = aiPlayerData;
        initialGameState.playerOrder.push(aiPlayerId);
        currentOrderIndex++;
    }

    const humanPlayersAddedCount = Object.values(initialGameState.players).filter(p => !p.isAI).length;

    if (humanPlayersAddedCount >= numHumanPlayers) {
        initialGameState.status = "active";
        initialGameState.preGamePhase = true;
        initialGameState.lastActionMessage = `${localPlayerName} created the game with ${numAIPlayers} AI(s). Starting pre-game rolls.`;
    } else {
        initialGameState.lastActionMessage = `${localPlayerName} created the game. Waiting for ${numHumanPlayers - humanPlayersAddedCount} more human player(s)...`;
    }


    try {
        await setDoc(gameDocRef, initialGameState);
        logEvent(`Game ${newGameId} created by ${localPlayerName}. Humans: ${numHumanPlayers}, AI: ${numAIPlayers}`);
        onlineSetupMessage.textContent = `Game created! ID: ${newGameId}. ${initialGameState.lastActionMessage}`;
        generatedGameIdSpan.textContent = newGameId;
        gameIdDisplayDiv.style.display = 'block';
        subscribeToGameState(newGameId);
    } catch (error) {
        console.error("Error creating game:", error);
        showMessageModal("Error", "Could not create game: " + error.message);
        onlineSetupMessage.textContent = "Failed to create game. " + error.message;
    }
}

async function handleJoinGame() {
    if (!currentUserId) {
        showMessageModal("Error", "You are not authenticated. Please wait or refresh.");
        return;
    }
    localPlayerName = playerNameInput.value.trim() || `Player ${currentUserId.substring(0,4)}`;
    if (!localPlayerName) {
        showMessageModal("Input Needed", "Please enter your player name.");
        return;
    }

    const gameIdToJoin = gameIdInput.value.trim().toUpperCase();
    if (!gameIdToJoin) {
        showMessageModal("Input Needed", "Please enter a Game ID to join.");
        return;
    }

    const gameDocRef = doc(db, "games", gameIdToJoin);

    try {
        await runTransaction(db, async (transaction) => {
            const gameDoc = await transaction.get(gameDocRef);
            if (!gameDoc.exists()) {
                throw new Error("Game not found.");
            }

            const gameData = gameDoc.data();
            if (gameData.boardLayout && gameData.boardLayout.length > 0) {
                boardLayout = gameData.boardLayout;
                const dcSpace = boardLayout.find(s => s.name === "Detention Center");
                detentionCenterSpaceId = dcSpace ? dcSpace.id : (boardLayout.find(s => s.type === "detention_visiting")?.id || 8);
            } else {
                reformatBoardLayout();
                logEvent("Warning: Joined game was missing boardLayout, reformatted locally.");
            }

            const numHumanPlayersInGame = Object.values(gameData.players).filter(p => !p.isAI).length;

            if (numHumanPlayersInGame >= gameData.numHumanPlayers) {
                if (!gameData.players[currentUserId]) {
                    throw new Error("Game is full for human players.");
                } else {
                    logEvent("Already part of this game as a human player. Rejoining/Resubscribing...");
                }
            }

            if (!gameData.players[currentUserId]) {
                const newPlayerOrderIndex = gameData.playerOrder.length;

                const newPlayerData = {
                    id: currentUserId, name: localPlayerName, money: 2000, position: 0, propertiesOwned: [],
                    healthServices: 0, getOutOfDetentionCards: 0, inDetention: false, missedTurnsInDetention: 0,
                    hasHousingVoucher: false, isBankrupt: false, playerActionTakenThisTurn: false,
                    doublesRolledInTurn: 0, order: newPlayerOrderIndex, govReceived: 0, isAI: false
                };

                const updates = {};
                updates[`players.${currentUserId}`] = newPlayerData;
                updates.playerOrder = arrayUnion(currentUserId);
                updates.updatedAt = serverTimestamp();

                const newTotalHumanCount = numHumanPlayersInGame + 1;

                if (newTotalHumanCount === gameData.numHumanPlayers) {
                    updates.preGamePhase = true;
                    updates.status = "active";
                    updates.lastActionMessage = `${localPlayerName} joined. All human players present! Starting pre-game rolls.`;
                } else {
                    updates.lastActionMessage = `${localPlayerName} joined the game. Waiting for ${gameData.numHumanPlayers - newTotalHumanCount} more human player(s).`;
                }
                transaction.update(gameDocRef, updates);
                logEvent(`${localPlayerName} joining game ${gameIdToJoin}. Player order index: ${newPlayerOrderIndex}`);
            }
        });

        currentGameId = gameIdToJoin;
        onlineSetupMessage.textContent = `Joined game ${gameIdToJoin}! Waiting for game to start...`;
        subscribeToGameState(gameIdToJoin);

    } catch (error) {
        console.error("Error joining game:", error);
        showMessageModal("Error", "Could not join game: " + error.message);
        onlineSetupMessage.textContent = "Failed to join game. " + error.message;
    }
}

// --- Firestore-driven Property Swap State ---
// Helper to clear swap proposal in Firestore
globalThis.clearSwapProposalInFirestore = async function(gameDocRef) {
    await updateDoc(gameDocRef, {
        currentSwapProposal: null,
        flashingProperties: [],
        updatedAt: serverTimestamp(),
    });
};

// --- Patch subscribeToGameState to sync swap state ---
function subscribeToGameState(gameId) {
    if (unsubscribeGameState) {
        unsubscribeGameState();
    }
    const gameDocRef = doc(db, "games", gameId);
    unsubscribeGameState = onSnapshot(gameDocRef, async (docSnap) => {
        if (docSnap.exists()) {
            const gameData = docSnap.data();

            if (localGameData.players && gameData.players && currentUserId &&
                localGameData.players[currentUserId] && gameData.players[currentUserId]) {

                const oldMoney = localGameData.players[currentUserId].money;
                const newMoney = gameData.players[currentUserId].money;

                if (typeof oldMoney !== 'undefined' && newMoney < oldMoney) {
                    const amountLost = oldMoney - newMoney;
                    if (amountLost > 0) {
                        showMoneyChangeEffect(amountLost, 'loss');
                    }
                } else if (typeof oldMoney !== 'undefined' && newMoney > oldMoney) {
                    const amountGained = newMoney - oldMoney;
                    if (amountGained > 0) {
                        showMoneyChangeEffect(amountGained, 'gain');
                    }
                }
            }

            const previousLocalGameDataForComparison = { ...localGameData }; // Store previous before overwriting
            localGameData = gameData;
            logEvent("Game state updated from Firestore:", gameData.lastActionMessage || "No message", gameData.status);

            // Animate opponent moves
            if (gameData.lastDiceRoll && gameData.players && previousLocalGameDataForComparison.players) { // Check previous state
                Object.values(gameData.players).forEach(player => {
                    if (player.id !== currentUserId && previousLocalGameDataForComparison.players[player.id]) {
                        const oldPlayerState = previousLocalGameDataForComparison.players[player.id];
                        if (oldPlayerState.position !== player.position &&
                            player.id === gameData.playerOrder[gameData.currentPlayerIndex] &&
                            !player.inDetention && !oldPlayerState.inDetention ) {

                            const playerMakingTurnId = gameData.playerOrder[gameData.currentPlayerIndex];
                            if (gameData.lastDiceRoll && player.id === playerMakingTurnId) {
                                logEvent(`Animating move for opponent ${player.name} from ${oldPlayerState.position} to ${player.position}`);
                                animatePlayerMove(player.id, oldPlayerState.position, gameData.lastDiceRoll.total, gameData.boardLayout);
                            }
                        }
                    }
                });
            }

            if (gameData.lastRentEvent && (!window._lastRentEventIdShown || window._lastRentEventIdShown !== gameData.lastRentEvent.id)) {
                window._lastRentEventIdShown = gameData.lastRentEvent.id;
                showRentFlashEffect(gameData.lastRentEvent.payerName, gameData.lastRentEvent.recipientName, gameData.lastRentEvent.amount, gameData.lastRentEvent.propertyName);
            }

            if (gameData.boardLayout && JSON.stringify(boardLayout) !== JSON.stringify(gameData.boardLayout)) {
                logEvent("Board layout received from Firestore is different or not set, adopting it.");
                boardLayout = gameData.boardLayout;
                const dcSpace = boardLayout.find(s => s.name === "Detention Center");
                detentionCenterSpaceId = dcSpace ? dcSpace.id : (boardLayout.find(s => s.type === "detention_visiting")?.id || 8);
                if (boardContainer.innerHTML.trim() !== '') {
                    logEvent("Board was already drawn, re-setting up from new Firestore layout.");
                    setupBoardFromFirestore(gameData);
                }
            }

            if (gameData.currentCardDraw && (!window._lastCardDrawIdShown || window._lastCardDrawIdShown !== gameData.currentCardDraw.id)) {
                window._lastCardDrawIdShown = gameData.currentCardDraw.id;
                logEvent("New card draw detected in onSnapshot:", gameData.currentCardDraw);
                showCardModal(gameData.currentCardDraw, gameData.currentCardDraw.type, async () => {
                    if (gameData.currentCardDraw.playerId === currentUserId || (localGameData.players[gameData.currentCardDraw.playerId]?.isAI && currentUserId === localGameData.hostId) ) {
                        await applyCardAction(gameData.currentCardDraw, gameData.currentCardDraw.playerId, gameData.currentCardDraw.type.toLowerCase());
                    }
                });
            } else if (!gameData.currentCardDraw) {
                window._lastCardDrawIdShown = null;
                if (onBoardCardDisplayDiv && onBoardCardDisplayDiv.style.display === 'flex') {
                    onBoardCardDisplayDiv.style.display = 'none';
                }
            }

            updateLocalUIFromFirestore(gameData);

            if (currentGameId && onlineSetupScreen.style.display !== 'none' && (gameData.status === "active" || gameData.status === "finished")) {
                onlineSetupScreen.style.display = 'none';
                gameContainer.style.display = 'flex';
                logEvent("Switched to game container as game status is active/finished and setup screen was visible.");
            }
            // AI Turn Logic Trigger
            if (
                gameData.status === "active" &&
                !gameData.preGamePhase &&
                gameData.playerOrder &&
                gameData.players &&
                gameData.hostId === currentUserId // Only host processes AI turns
            ) {
                const currentPlayerId = gameData.playerOrder[gameData.currentPlayerIndex];
                const currentPlayer = gameData.players[currentPlayerId];
                if (currentPlayer && currentPlayer.isAI && !currentPlayer.isBankrupt) {
                    if (!window._aiTurnInProgress) {
                        window._aiTurnInProgress = true;
                        logEvent(`Host (${currentUserId}) is about to trigger AI turn for ${currentPlayerId}.`);
                        setTimeout(async () => {
                            try {
                                const freshGameSnapshotForAI = await getDoc(doc(db, "games", gameId));
                                if (freshGameSnapshotForAI.exists()) {
                                    const freshGameDataForAI = freshGameSnapshotForAI.data();
                                    if (freshGameDataForAI.playerOrder[freshGameDataForAI.currentPlayerIndex] === currentPlayerId &&
                                        freshGameDataForAI.players[currentPlayerId]?.isAI &&
                                        !freshGameDataForAI.players[currentPlayerId]?.isBankrupt &&
                                        freshGameDataForAI.hostId === currentUserId &&
                                        freshGameDataForAI.status === "active" &&
                                        !freshGameDataForAI.preGamePhase) {
                                        logEvent(`AI ${currentPlayerId} turn conditions valid. Processing turn.`);
                                        await handleAITurn(freshGameDataForAI, currentPlayerId);
                                    } else {
                                        logEvent(`AI ${currentPlayerId} turn skipped: Invalid conditions. CurrentPlayer: ${freshGameDataForAI.playerOrder[freshGameDataForAI.currentPlayerIndex]}, IsAI: ${freshGameDataForAI.players[currentPlayerId]?.isAI}, Bankrupt: ${freshGameDataForAI.players[currentPlayerId]?.isBankrupt}, Host: ${freshGameDataForAI.hostId === currentUserId}, Status: ${freshGameDataForAI.status}, PreGame: ${freshGameDataForAI.preGamePhase}`);
                                         window._aiTurnInProgress = false; // Release lock if conditions fail
                                    }
                                } else {
                                    logEvent(`AI ${currentPlayerId} turn skipped: Game document not found.`);
                                     window._aiTurnInProgress = false; // Release lock
                                }
                            } catch (error) {
                                logEvent(`AI ${currentPlayerId} turn processing failed: ${error.message}`, error);
                                 window._aiTurnInProgress = false; // Release lock on error
                            } finally {
                                // window._aiTurnInProgress is typically set to false at the end of handleAITurn
                            }
                        }, 1500);
                    } else {
                        logEvent(`AI ${currentPlayerId} turn skipped: Previous AI turn still in progress.`);
                    }
                } else if (currentPlayer) {
                    // logEvent(`AI turn check for ${currentPlayerId} skipped: Not AI or bankrupt. IsAI: ${currentPlayer.isAI}, Bankrupt: ${currentPlayer.isBankrupt}`);
                }
            }

            // --- Sync property swap state from Firestore ---
            if (gameData.currentSwapProposal) {
                window._propertySwapState = { ...gameData.currentSwapProposal };
                // Timeout: if proposal is older than 10s, clear it
                if (Date.now() - (gameData.currentSwapProposal.swapTimeoutSetAt || 0) > 10000) {
                    await clearSwapProposalInFirestore(gameDocRef);
                    window._propertySwapState = { cardA: null, cardB: null, swapInitiatorPlayerId: null, swapActive: false, swapTimeout: null };
                }
            } else {
                window._propertySwapState = { cardA: null, cardB: null, swapInitiatorPlayerId: null, swapActive: false, swapTimeout: null };
            }

        } else {
            logEvent(`Game ${gameId} no longer exists or access denied.`);
            showMessageModal("Game Ended", "The game session has ended or is no longer available.");
            if (unsubscribeGameState) unsubscribeGameState();
            resetToSetupScreen();
        }
    }, (error) => {
        console.error("Error listening to game state:", error);
        showMessageModal("Connection Error", "Lost connection to the game: " + error.message);
        if (unsubscribeGameState) unsubscribeGameState();
        resetToSetupScreen();
    });
}

function resetToSetupScreen() {
    onlineSetupScreen.style.display = 'flex';
    gameContainer.style.display = 'none';
    currentGameId = null;
    localGameData = {};
    if (unsubscribeGameState) {
        unsubscribeGameState();
        unsubscribeGameState = null;
    }
    onlineSetupMessage.textContent = "Ready to create or join a new game.";
    gameIdDisplayDiv.style.display = 'none';
    generatedGameIdSpan.textContent = '';
    gameIdInput.value = '';
    boardLayout = [];
    if(boardContainer) boardContainer.innerHTML = '';
    if(playerInfoDiv) playerInfoDiv.innerHTML = '';
    if(diceFace1Elem) diceFace1Elem.textContent = '--';
    if(diceFace2Elem) diceFace2Elem.textContent = '--';
    if(diceTotalDisplayText) diceTotalDisplayText.textContent = '';
    if(currentTurnDisplay) currentTurnDisplay.textContent = 'Current Turn: Player 1';
    if(gameStatusMessageP) gameStatusMessageP.textContent = 'Waiting for game to start...';
    // Reset swap state
    window._propertySwapState = { cardA: null, cardB: null, swapInitiatorPlayerId: null, swapActive: false, swapTimeout: null };
}

async function finalizePreGameAsHost() {
    if (!currentGameId || !currentUserId || !db || !localGameData.hostId || localGameData.hostId !== currentUserId) {
        logEvent("finalizePreGameAsHost: Conditions not met.");
        return;
    }
    logEvent("Host attempting to finalize pre-game rolls.");

    const gameDocRef = doc(db, "games", currentGameId);
    try {
        await runTransaction(db, async (transaction) => {
            const freshGameDoc = await transaction.get(gameDocRef);
            if (!freshGameDoc.exists()) {
                throw new Error("Game document not found during host finalization.");
            }
            const freshGameData = freshGameDoc.data();

            if (!freshGameData.preGamePhase) {
                logEvent("Host finalization: Pre-game phase already ended.");
                return;
            }
            if (freshGameData.hostId !== currentUserId) {
                logEvent("Host finalization check: Current user is NOT host in fresh data. Aborting.");
                return;
            }

            const allPlayersInOrder = freshGameData.playerOrder || [];
            const currentPreGameRolls = freshGameData.preGameRolls || {};
            const allHaveRolled = allPlayersInOrder.length > 0 &&
                allPlayersInOrder.length === freshGameData.maxPlayers &&
                allPlayersInOrder.every(pid => currentPreGameRolls[pid] !== undefined);

            if (!allHaveRolled) {
                logEvent("Host finalization: Not all players have rolled or not all joined. Aborting.");
                return;
            }

            logEvent("Host is proceeding with finalization of pre-game rolls.");
            let updates = {};
            const sortedPlayerIds = [...allPlayersInOrder].sort((a, b) => {
                const rollA = currentPreGameRolls[a];
                const rollB = currentPreGameRolls[b];
                if (rollB === rollA) {
                    return (freshGameData.players[a]?.order || 0) - (freshGameData.players[b]?.order || 0);
                }
                return rollB - rollA;
            });

            updates.playerOrder = sortedPlayerIds;
            updates.currentPlayerIndex = 0;
            updates.preGamePhase = false;
            updates.gamePhase = "main";
            updates.status = "active";
            updates.lastActionMessage = `Starting order determined by host. ${freshGameData.players[sortedPlayerIds[0]].name} starts!`;
            updates.updatedAt = serverTimestamp();

            transaction.update(gameDocRef, updates);
            logEvent("Host successfully finalized pre-game starting order.");
        });
    } catch (error) {
        console.error("Error during host finalization of pre-game rolls:", error);
        showMessageModal("Host Finalization Error", "Could not finalize game start: " + error.message);
    }
}

// --- UI HELPER FUNCTION DEFINITIONS ---
function updateDiceUIDisplay(gameData) {
    const diceDisplayContainer = document.getElementById('actual-dice-faces');
    if (!diceFace1Elem || !diceFace2Elem || !diceTotalDisplayText || !diceDisplayContainer) return;

    if (gameData.lastDiceRoll && gameData.gamePhase === "main" && !gameData.preGamePhase) {
        diceFace1Elem.textContent = gameData.lastDiceRoll.die1;
        diceFace2Elem.textContent = gameData.lastDiceRoll.die2;
        diceTotalDisplayText.textContent = ` = ${gameData.lastDiceRoll.total}`;

        diceDisplayContainer.classList.remove('dice-animation');
        void diceDisplayContainer.offsetWidth;
        diceDisplayContainer.classList.add('dice-animation');
    } else {
        diceFace1Elem.textContent = '--';
        diceFace2Elem.textContent = '--';
        diceTotalDisplayText.textContent = '';
        diceDisplayContainer.classList.remove('dice-animation');
    }
}

function updatePlayerInfoPanel(gameData) {
    if (!playerInfoDiv) return;
    playerInfoDiv.innerHTML = '';
    if (!gameData.playerOrder || !gameData.players) {
        logEvent("updatePlayerInfoPanel: Missing playerOrder or players data.");
        return;
    }

    gameData.playerOrder.forEach(playerId => {
        const p = gameData.players[playerId];
        if (!p || typeof p.id === 'undefined' || typeof p.order === 'undefined') {
            logEvent("updatePlayerInfoPanel: Invalid player data encountered for ID:", playerId, p);
            return;
        };

        const playerColor = playerColors[p.order % playerColors.length];
        const pDiv = document.createElement('div');
        if (p.isBankrupt) {
            pDiv.innerHTML = `<b style="color:${playerColor};">${p.name} ${p.isAI ? "(AI)" : ""}</b>: BANKRUPT`;
            pDiv.style.textDecoration = 'line-through';
            pDiv.style.opacity = '0.6';
        } else {
            pDiv.innerHTML = `<b style='color:${playerColor};'>${p.name} ${p.isAI ? "(AI)" : ""}</b>: <span style='font-weight:bold;'>£${p.money}</span> | HS: ${p.healthServices} | LegalAids: ${p.getOutOfDetentionCards}`;
            if (p.inDetention) pDiv.innerHTML += ` (In Detention - ${p.missedTurnsInDetention} missed)`;
        }
        if (!gameData.preGamePhase && gameData.status === "active" && gameData.playerOrder[gameData.currentPlayerIndex] === p.id && !p.isBankrupt) {
            pDiv.style.border = `2px solid ${playerColor}`;
            pDiv.style.padding = "3px";
            pDiv.style.borderRadius = "4px";
            pDiv.classList.add('player-highlight');
        } else {
            pDiv.classList.remove('player-highlight');
        }
        playerInfoDiv.appendChild(pDiv);
    });
}

function updateGameStatusPanel(gameData) {
    if (!gameStatusMessageP || !currentTurnDisplay || !gameData.players || !gameData.playerOrder) return;

    if (gameData.preGamePhase) {
        const joinedHumans = Object.values(gameData.players).filter(p => !p.isAI).length;
        if (joinedHumans < gameData.numHumanPlayers) {
            gameStatusMessageP.textContent = `Waiting for human players... (${joinedHumans}/${gameData.numHumanPlayers} joined)`;
        } else {
            const allPlayersCount = gameData.playerOrder.length;
            const allRolled = allPlayersCount > 0 && gameData.playerOrder.every(pid => gameData.preGameRolls && gameData.preGameRolls[pid] !== undefined);
            if (allRolled) {
                gameStatusMessageP.textContent = "All players rolled. Host is determining start order...";
            } else {
                gameStatusMessageP.textContent = "Pre-game: All human players joined. Determine starting player by rolling.";
            }
        }
    } else if (gameData.status === "active" && gameData.gamePhase === "main") {
        gameStatusMessageP.textContent = gameData.lastActionMessage || "Game in progress...";
    } else if (gameData.status === "finished") {
        gameStatusMessageP.textContent = gameData.lastActionMessage || "Game Over!";
    } else {
        const joinedHumans = Object.values(gameData.players).filter(p => !p.isAI).length;
        gameStatusMessageP.textContent = `Waiting for players... (${joinedHumans}/${gameData.numHumanPlayers} humans joined)`;
    }

    const currentPlayerIdInOrder = gameData.playerOrder[gameData.currentPlayerIndex];
    const currentPlayerInOrder = gameData.players[currentPlayerIdInOrder];

    if (currentPlayerInOrder && gameData.status === "active") {
        const playerNameForDisplay = `${currentPlayerInOrder.name}${currentPlayerInOrder.isAI ? " (AI)" : ""}`;
        if (gameData.preGamePhase) {
            let nextPlayerToRollForDisplayId = null;
            for(const pid of gameData.playerOrder) {
                if(!gameData.preGameRolls || gameData.preGameRolls[pid] === undefined) {
                    nextPlayerToRollForDisplayId = pid;
                    break;
                }
            }
            const playerToRoll = gameData.players[nextPlayerToRollForDisplayId];
            const playerToRollName = playerToRoll ? `${playerToRoll.name}${playerToRoll.isAI ? " (AI)" : ""}` : null;


            if (playerToRoll && typeof playerToRoll.order !== 'undefined') {
                currentTurnDisplay.textContent = `Pre-Game Roll: ${playerToRollName}`;
                currentTurnDisplay.style.color = playerColors[playerToRoll.order % playerColors.length];
                currentTurnDisplay.classList.remove('pulsing');
            } else if (gameData.playerOrder.length === gameData.maxPlayers && gameData.playerOrder.every(pid => gameData.preGameRolls && gameData.preGameRolls[pid] !== undefined)) {
                currentTurnDisplay.textContent = "Pre-Game Rolls Complete";
                currentTurnDisplay.style.color = '#ecf0f1';
                currentTurnDisplay.classList.remove('pulsing');
            } else {
                currentTurnDisplay.textContent = "Waiting for Players...";
                currentTurnDisplay.style.color = '#ecf0f1';
                currentTurnDisplay.classList.remove('pulsing');
            }
        } else if (gameData.gamePhase === "main" && !currentPlayerInOrder.isBankrupt) {
            currentTurnDisplay.textContent = `Current Turn: ${playerNameForDisplay}`;
            currentTurnDisplay.style.color = playerColors[currentPlayerInOrder.order % playerColors.length];
            currentTurnDisplay.classList.add('pulsing');
        } else if (gameData.gamePhase === "main" && currentPlayerInOrder.isBankrupt) {
            currentTurnDisplay.textContent = `Skipping Bankrupt: ${playerNameForDisplay}`;
            currentTurnDisplay.style.color = '#7f8c8d';
            currentTurnDisplay.classList.remove('pulsing');
        }
    } else if (gameData.status === "finished") {
        currentTurnDisplay.textContent = "Game Over!";
        currentTurnDisplay.style.color = '#e74c3c';
        currentTurnDisplay.classList.remove('pulsing');
    } else {
        currentTurnDisplay.textContent = "Game Not Fully Started";
        currentTurnDisplay.style.color = '#ecf0f1';
        currentTurnDisplay.classList.remove('pulsing');
    }
}

function updateControlsBasedOnTurn(gameData) {
    if (!currentUserId || !gameData.players || !gameData.players[currentUserId]) {
        rollDiceButton.style.display = 'none';
        endTurnButton.style.display = 'none';
        buyPropertyButton.style.display = 'none';
        developPropertyButton.style.display = 'none';
        otherActionsContainer.style.display = 'none';
        detentionActionsDiv.innerHTML = '';
        return;
    }
    const amIBankrupt = gameData.players[currentUserId]?.isBankrupt;
    const amIAI = gameData.players[currentUserId]?.isAI;

    rollDiceButton.style.display = 'none';
    endTurnButton.style.display = 'none';
    buyPropertyButton.style.display = 'none';
    developPropertyButton.style.display = 'none';
    otherActionsContainer.style.display = 'none';
    detentionActionsDiv.innerHTML = '';

    if (amIBankrupt || amIAI || gameData.status === "finished" || gameData.preGamePhase) {
        const playerToken = document.getElementById(`player-token-${currentUserId}`);
        if (playerToken) playerToken.classList.remove('token-flash');
        return;
    }

    if (gameData.status !== "active" || gameData.gamePhase !== "main") return;

    const isMyTurn = gameData.playerOrder[gameData.currentPlayerIndex] === currentUserId;
    const myPlayerState = gameData.players[currentUserId];
    const amIInDetention = myPlayerState.inDetention;
    const myPlayerActionTakenThisTurn = myPlayerState.playerActionTakenThisTurn;

    const playerToken = document.getElementById(`player-token-${currentUserId}`);
    if (isMyTurn) {
        if (playerToken && cardDisplayContainer.style.display === 'none' && developPropertyContainer.style.display === 'none' && (!onBoardCardDisplayDiv || onBoardCardDisplayDiv.style.display === 'none')) {
            playerToken.classList.add('token-flash');
        } else if (playerToken) {
            playerToken.classList.remove('token-flash');
        }
    } else {
        if (playerToken) playerToken.classList.remove('token-flash');
    }


    if (isMyTurn) {
        if (amIInDetention) {
            setupDetentionActionsUI(myPlayerState, gameData);
            if (myPlayerActionTakenThisTurn) {
                endTurnButton.style.display = 'block';
                endTurnButton.disabled = false;
                endTurnButton.classList.add('main-action-button');
                detentionActionsDiv.innerHTML = '';
            }
        } else {
            const rolledDoubles = gameData.lastDiceRoll?.isDoubles;
            const doublesCount = myPlayerState.doublesRolledInTurn || 0;

            if (!myPlayerActionTakenThisTurn || (rolledDoubles && doublesCount > 0 && doublesCount < 3) ) {
                rollDiceButton.style.display = 'block';
                rollDiceButton.disabled = false;
                rollDiceButton.classList.add('main-action-button');
                if (rolledDoubles && doublesCount > 0 && doublesCount < 3 && gameStatusMessageP) {
                    gameStatusMessageP.textContent = `${myPlayerState.name} rolled doubles! Roll again.`;
                }
            }

            let showOptionalActions = false;
            if (gameData.lastDiceRoll || myPlayerActionTakenThisTurn) {
                showOptionalActions = true;
            }


            if (showOptionalActions) {
                otherActionsContainer.style.display = 'block';
                const currentSpace = gameData.boardLayout[myPlayerState.position];
                const propData = Array.isArray(gameData.propertyData) ? gameData.propertyData.find(p => p.id === currentSpace?.id) : null;

                if (currentSpace && propData && (currentSpace.type === 'property' || currentSpace.type === 'set_property') && propData.owner === null) {
                    let price = currentSpace.price;
                    if (myPlayerState.hasHousingVoucher && currentSpace.type === 'property') {
                        price = Math.round(price * 0.75);
                    }
                    buyPropertyPriceSpan.textContent = price;
                    buyPropertyButton.style.display = (myPlayerState.money >= price) ? 'inline-block' : 'none';
                    if (buyPropertyButton.style.display === 'inline-block') buyPropertyButton.disabled = false;
                } else {
                    buyPropertyButton.style.display = 'none';
                }

                developPropertyButton.style.display = canPlayerDevelopAnyProperty(myPlayerState, gameData) ? 'inline-block' : 'none';
                if (developPropertyButton.style.display === 'inline-block') {
                    developPropertyButton.disabled = false;
                }

                if (buyPropertyButton.style.display === 'none' && developPropertyButton.style.display === 'none') {
                    otherActionsContainer.style.display = 'none';
                }
            } else {
                otherActionsContainer.style.display = 'none';
            }

            if (myPlayerActionTakenThisTurn && !(rolledDoubles && doublesCount > 0 && doublesCount < 3) ) {
                endTurnButton.style.display = 'block';
                endTurnButton.disabled = false;
                endTurnButton.classList.add('main-action-button');
            }

            const noMandatoryRollPending = !((myPlayerState.doublesRolledInTurn || 0) > 0 && (myPlayerState.doublesRolledInTurn || 0) < 3 && !myPlayerActionTakenThisTurn);
            const noOptionalActionsAvailable = buyPropertyButton.style.display === 'none' && developPropertyButton.style.display === 'none';
            const noCardActionPending = cardDisplayContainer.style.display === 'none' && (!onBoardCardDisplayDiv || onBoardCardDisplayDiv.style.display === 'none');

            if (myPlayerActionTakenThisTurn && noMandatoryRollPending && noOptionalActionsAvailable && noCardActionPending) {
                logEvent("Auto-ending turn conditions met. Setting timeout.");
                setTimeout(() => {
                    const freshLocalDataForAutoEnd = localGameData;
                    if (freshLocalDataForAutoEnd && freshLocalDataForAutoEnd.players && freshLocalDataForAutoEnd.players[currentUserId]) {
                        const stillMyTurnNow = freshLocalDataForAutoEnd.playerOrder[freshLocalDataForAutoEnd.currentPlayerIndex] === currentUserId;
                        const playerStateNow = freshLocalDataForAutoEnd.players[currentUserId];

                        const noRollPendingNow = !((playerStateNow.doublesRolledInTurn || 0) > 0 && (playerStateNow.doublesRolledInTurn || 0) < 3 && !playerStateNow.playerActionTakenThisTurn);
                        const noOptionsNow = document.getElementById('buy-property-button').style.display === 'none' &&
                            document.getElementById('develop-property-button').style.display === 'none';
                        const noCardNow = document.getElementById('card-display-container').style.display === 'none' &&
                            (!document.getElementById('on-board-card-display') || document.getElementById('on-board-card-display').style.display === 'none');

                        if (stillMyTurnNow && playerStateNow.playerActionTakenThisTurn && noRollPendingNow && noOptionsNow && noCardNow) {
                            logEvent("Auto-end conditions still met in timeout. Calling handleEndTurnAction.");
                            handleEndTurnAction();
                        } else {
                            logEvent("Auto-end conditions changed during timeout or not my turn anymore. Not auto-ending.");
                        }
                    } else {
                        logEvent("Auto-end timeout: Could not get fresh player data. Not auto-ending.");
                    }
                }, 1500);
            }
        }
    }
}

function updatePreGameRollUI(gameData) {
    if (!preGameRollArea || !preGameRollButton || !preGameRollResultsDiv || !gameData.players) {
        logEvent("updatePreGameRollUI: Missing DOM elements or player data.");
        return;
    }

    const allExpectedHumansJoined = Object.values(gameData.players).filter(p => !p.isAI).length >= gameData.numHumanPlayers;
    if (!gameData.preGamePhase || gameData.status !== "active" || !allExpectedHumansJoined || gameData.playerOrder.length < gameData.maxPlayers) {
        preGameRollArea.style.display = 'none';
        preGameRollButton.style.display = 'none';
        return;
    }

    preGameRollArea.style.display = 'flex';
    preGameRollResultsDiv.innerHTML = '';
    preGameRollButton.style.display = 'none';

    let allPlayerIdsInOrder = gameData.playerOrder || [];
    let preGameRollsData = gameData.preGameRolls || {};
    let numberOfPlayers = allPlayerIdsInOrder.length;

    let rolledPlayerCount = 0;
    allPlayerIdsInOrder.forEach(pid => {
        const player = gameData.players[pid];
        if (!player) return;
        const playerName = `${player.name}${player.isAI ? " (AI)" : ""}`;
        const playerOrderForColor = player.order;
        const playerColor = (typeof playerOrderForColor !== 'undefined') ? playerColors[playerOrderForColor % playerColors.length] : '#ecf0f1';

        if (preGameRollsData[pid] !== undefined) {
            preGameRollResultsDiv.innerHTML += `<span style="color:${playerColor};">${playerName}</span> rolled: ${preGameRollsData[pid]}<br>`;
            rolledPlayerCount++;
        } else {
            preGameRollResultsDiv.innerHTML += `<span style="color:${playerColor};">${playerName}</span> has not rolled yet.<br>`;
        }
    });

    if (rolledPlayerCount === numberOfPlayers && numberOfPlayers > 0 && numberOfPlayers === gameData.maxPlayers) {
        preGameRollResultsDiv.innerHTML += "All players rolled. Host is determining start order...";
    } else if (numberOfPlayers > 0 && numberOfPlayers === gameData.maxPlayers) {
        let nextPlayerToRollId = null;
        const sortedByJoinOrder = [...allPlayerIdsInOrder].sort((a,b) => (gameData.players[a]?.order || 0) - (gameData.players[b]?.order || 0));

        for (const pid of sortedByJoinOrder) {
            if (preGameRollsData[pid] === undefined) {
                nextPlayerToRollId = pid;
                break;
            }
        }

        const nextPlayerToRollData = gameData.players[nextPlayerToRollId];
        if (nextPlayerToRollId === currentUserId && !nextPlayerToRollData.isAI) { // Only human players click the button
            preGameRollButton.style.display = 'block';
            preGameRollButton.textContent = `Your turn, ${nextPlayerToRollData.name}, Roll to Start`;
            preGameRollButton.disabled = false;
        } else if (nextPlayerToRollData) {
            const nextPlayerToRollName = `${nextPlayerToRollData.name}${nextPlayerToRollData.isAI ? " (AI)" : ""}`;
            preGameRollButton.style.display = 'block';
            preGameRollButton.textContent = `Waiting for ${nextPlayerToRollName} to roll...`;
            preGameRollButton.disabled = true;
        } else if (rolledPlayerCount < numberOfPlayers) {
            preGameRollButton.style.display = 'block';
            preGameRollButton.textContent = `Waiting for players to roll...`;
            preGameRollButton.disabled = true;
        }
    } else {
        preGameRollResultsDiv.innerHTML = "Waiting for all players to join before starting rolls...";
    }
}

function updateUkGovDisplay(govMoney) {
    if (ukGovCashSpan) {
        ukGovCashSpan.textContent = govMoney !== undefined ? govMoney : (localGameData.ukGovMoney || 20000);
    }
}

function handleGameEndUI(gameData) {
    if (!gameStatusMessageP || !currentTurnDisplay || !rollDiceButton || !endTurnButton || !buyPropertyButton || !developPropertyButton || !preGameRollArea || !otherActionsContainer) return;

    gameStatusMessageP.textContent = gameData.lastActionMessage || "Game Over!";
    currentTurnDisplay.textContent = "Game Over!";
    currentTurnDisplay.style.color = '#e74c3c';

    rollDiceButton.style.display = 'none';
    endTurnButton.style.display = 'none';
    buyPropertyButton.style.display = 'none';
    developPropertyButton.style.display = 'none';
    preGameRollArea.style.display = 'none';
    detentionActionsDiv.innerHTML = '';

    otherActionsContainer.style.display = 'block';
    otherActionsContainer.innerHTML = '<button id="leave-game-button" style="background-color:#c0392b;">Back to Setup</button>';
    const leaveButton = document.getElementById('leave-game-button');
    if (leaveButton) {
        leaveButton.onclick = () => {
            if (unsubscribeGameState) unsubscribeGameState();
            resetToSetupScreen();
        };
    }
}

function setupBoardFromFirestore(gameData) {
    if (!boardContainer) {
        logEvent("Error: boardContainer DOM element not found in setupBoardFromFirestore.");
        return;
    }
    boardContainer.innerHTML = '';

    if (gameData.boardLayout && gameData.boardLayout.length > 0) {
        boardLayout = gameData.boardLayout;
    } else {
        logEvent("setupBoardFromFirestore: gameData.boardLayout is missing or empty. Cannot setup board.");
        return;
    }

    const dcSpace = boardLayout.find(s => s.name === "Detention Center");
    detentionCenterSpaceId = dcSpace ? dcSpace.id : (boardLayout.find(s => s.type === "detention_visiting")?.id || 8);

    const cardDecksCenter = document.createElement('div');
    cardDecksCenter.id = 'card-decks-center';
    const centerImage = document.createElement('img');
    centerImage.id = 'center-board-image';
    centerImage.src = 'migrant3.jpg';
    centerImage.alt = 'Migrantopoly Center';
    cardDecksCenter.appendChild(centerImage);
    boardContainer.appendChild(cardDecksCenter);

    const onBoardCardDiv = document.createElement('div');
    onBoardCardDiv.id = 'on-board-card-display';
    onBoardCardDiv.style.display = 'none';
    onBoardCardDiv.innerHTML = `
        <h4 id="on-board-card-type">Card Type</h4>
        <p id="on-board-card-text">Card text will appear here.</p>
        <button id="on-board-card-ok-button">OK</button> 
    `;
    boardContainer.appendChild(onBoardCardDiv);
    onBoardCardDisplayDiv = document.getElementById('on-board-card-display');
    onBoardCardTypeH4 = document.getElementById('on-board-card-type');
    onBoardCardTextP = document.getElementById('on-board-card-text');
    onBoardCardOkButton = document.getElementById('on-board-card-ok-button');

    if (onBoardCardOkButton) {
        onBoardCardOkButton.onclick = () => {
            onBoardCardDisplayDiv.style.display = 'none';
            if (localGameData && currentUserId && localGameData.players && localGameData.players[currentUserId]) {
                updateControlsBasedOnTurn(localGameData);
            }
        };
    }
    
    boardLayout.forEach((s) => {
        const spaceDiv = document.createElement('div');
        spaceDiv.id = `space-${s.id}`;
        spaceDiv.classList.add('space');
        if (s.type === 'go' || s.type === 'detention_visiting' || s.type === 'go_to_detention' || s.type === 'crime_spree') {
            spaceDiv.classList.add('corner');
        }
        if (['Fake PIP declined', 'Fake ID Cards', "Payout: Job Seeker's"].includes(s.name)) {
            spaceDiv.classList.add('yellow-boardname');
        }
        if (s.name === "Dole" && s.type === "go"){
            spaceDiv.classList.add('dole-space');
            const doleSign = document.createElement('div');
            doleSign.classList.add('dole-sign');
            doleSign.textContent = '$';
            spaceDiv.appendChild(doleSign);
        }
        if (s.name === 'Detention Center') {
            const bars = document.createElement('div'); bars.className = 'detention-bars';
            for (let b = 0; b < 6; b++) { const bar = document.createElement('div'); bar.className = 'detention-bar'; bars.appendChild(bar); }
            spaceDiv.appendChild(bars);
        }
        if (s.name === 'Go to Detention Center') {
            const arrow = document.createElement('div'); arrow.className = 'detention-arrow'; arrow.textContent = '→'; spaceDiv.appendChild(arrow);
            const subLabel = document.createElement('div'); subLabel.className = 'sub-label'; subLabel.textContent = 'DO NOT PASS DOLE'; spaceDiv.appendChild(subLabel);
        }
        if (s.type === 'property') {
            spaceDiv.classList.add('property', s.color || s.groupId);
            const colorBar = document.createElement('div'); colorBar.classList.add('color-bar');
            if (["Tesco Cardboard Skip 1", "Tesco Cardboard Skip 2", "Tesco Cardboard Skip 3"].includes(s.name)) {
                colorBar.style.backgroundColor = '#2196f3';
            }
            spaceDiv.appendChild(colorBar);
        } else if (s.type === 'set_property') {
            spaceDiv.classList.add('set-property');
        }
        const nameDiv = document.createElement('div'); nameDiv.classList.add('name');
        if (s.name === 'Detention Center') nameDiv.classList.add('detention-center-name');
        nameDiv.textContent = s.name;
        if (s.type === 'opportunity' || s.type === 'welfare') {
            nameDiv.style.color = '#ff9800';
        }
        spaceDiv.appendChild(nameDiv);

        if (s.type === 'property' && s.rent) {
            const devIndicator = document.createElement('div');
            devIndicator.classList.add('development-indicator');
            devIndicator.id = `dev-indicator-${s.id}`;
            spaceDiv.appendChild(devIndicator);
        }
        if (s.price) {
            const priceDiv = document.createElement('div'); priceDiv.classList.add('price');
            priceDiv.textContent = `£${s.price}`; spaceDiv.appendChild(priceDiv);
        }
        if (s.type === 'property' || s.type === 'set_property') {
            const ownerIndicator = document.createElement('div');
            ownerIndicator.classList.add('owner-indicator');
            ownerIndicator.id = `owner-indicator-${s.id}`;
            spaceDiv.appendChild(ownerIndicator);
        }

        const currentId = s.id;
        if (currentId === 0) { spaceDiv.style.gridArea = `1 / 1`; }
        else if (currentId >= 1 && currentId <= 8) { spaceDiv.style.gridArea = `1 / ${currentId + 1}`; }
        else if (currentId === 9) { spaceDiv.style.gridArea = `1 / 10`; }
        else if (currentId >= 10 && currentId <= 17) { spaceDiv.style.gridArea = `${(currentId - 9) + 1} / 10`; }
        else if (currentId === 18) { spaceDiv.style.gridArea = `10 / 10`; }
        else if (currentId >= 19 && currentId <= 26) { spaceDiv.style.gridArea = `10 / ${10 - (currentId - 18)}`; }
        else if (currentId === 27) { spaceDiv.style.gridArea = `10 / 1`; }
        else if (currentId >= 28 && currentId <= 31) {
            spaceDiv.style.gridArea = `${10 - (currentId - 27)} / 1`;
        } else if (currentId >= 28 && currentId <= 35) {
            spaceDiv.style.gridArea = `${10 - (currentId - 27)} / 1`;
        }

        // For general single-click info or other non-swap actions
        spaceDiv.addEventListener('click', (e) => {
            handlePropertyCardClick(s, spaceDiv, localGameData);
        });
        // For swap initiation
        spaceDiv.addEventListener('dblclick', (e) => {
            handlePropertyCardDoubleClick(s, spaceDiv, localGameData); // Pass current localGameData
        });

        boardContainer.appendChild(spaceDiv);
    });

    if (gameData.players && gameData.playerOrder) {
        Object.values(gameData.players).forEach(player => {
            if (player && typeof player.id !== 'undefined' && typeof player.order !== 'undefined') {
                let token = document.getElementById(`player-token-${player.id}`);
                if (!token) {
                    token = document.createElement('div');
                    token.id = `player-token-${player.id}`;
                    token.classList.add('player-token');
                }
                token.textContent = playerEmojis[player.order % playerEmojis.length];
                const playerTokenColor = playerColors[player.order % playerColors.length];
                token.style.color = playerTokenColor;
                token.style.filter = `drop-shadow(0 0 4px ${playerTokenColor})`;

                const spaceToPlace = document.getElementById(`space-${player.position}`);
                if (spaceToPlace) {
                    spaceToPlace.appendChild(token);
                } else {
                    logEvent(`Warning: Could not find space-${player.position} to place token for ${player.name}`);
                    const goSpace = document.getElementById('space-0');
                    if (goSpace) goSpace.appendChild(token);
                }
            } else {
                logEvent("Warning: Invalid player data in setupBoardFromFirestore, skipping token creation/update.", player);
            }
        });
    } else {
        logEvent("Warning: gameData.players or gameData.playerOrder is missing in setupBoardFromFirestore. Tokens not created.");
    }
    updateBoardDynamicElements(gameData);
}

function updateBoardDynamicElements(gameData) {
    if (!gameData || !gameData.players || !gameData.boardLayout) {
        logEvent("updateBoardDynamicElements: Missing critical gameData. Skipping updates.");
        return;
    }

    Object.values(gameData.players).forEach(player => {
        if (!player || typeof player.id === 'undefined') {
            // logEvent("updateBoardDynamicElements: Invalid player object in players list.", player); // Can be noisy
            return;
        }
        const token = document.getElementById(`player-token-${player.id}`);
        if (token) {
            if (player.isBankrupt) {
                token.style.display = 'none';
            } else {
                token.style.display = 'block';
                const currentSpaceEl = document.getElementById(`space-${player.position}`);
                if (currentSpaceEl) {
                    if (token.parentNode !== currentSpaceEl) {
                        currentSpaceEl.appendChild(token);
                    }
                } else {
                    // logEvent(`updateBoardDynamicElements: Could not find space-${player.position} for token ${player.id}`); // Can be noisy
                }
            }
        } else {
            // logEvent(`updateBoardDynamicElements: Token not found for player ${player.id}. It should have been created.`); // Can be noisy
        }
    });

    if (Array.isArray(gameData.propertyData)) {
        gameData.propertyData.forEach(propInPropertyData => {
            if (!propInPropertyData || typeof propInPropertyData.id === 'undefined') {
                // logEvent("Warning: Invalid item in propertyData array during UI update, skipping this item.", propInPropertyData); // Can be noisy
                return;
            }

            const ownerIndicator = document.getElementById(`owner-indicator-${propInPropertyData.id}`);
            if (ownerIndicator) {
                if (propInPropertyData.owner && gameData.players[propInPropertyData.owner] && !gameData.players[propInPropertyData.owner].isBankrupt) {
                    const ownerData = gameData.players[propInPropertyData.owner];
                    if (ownerData && typeof ownerData.order !== 'undefined') {
                        const ownerColor = playerColors[ownerData.order % playerColors.length];
                        ownerIndicator.style.backgroundColor = ownerColor;
                    } else {
                        ownerIndicator.style.backgroundColor = 'transparent';
                    }
                } else {
                    ownerIndicator.style.backgroundColor = 'transparent';
                }
            }

            const boardSpaceDetails = gameData.boardLayout.find(s => s.id === propInPropertyData.id);
            if (boardSpaceDetails && boardSpaceDetails.type === 'property') {
                const devIndicator = document.getElementById(`dev-indicator-${propInPropertyData.id}`);
                if (devIndicator) {
                    if (propInPropertyData.permanentResidence) {
                        devIndicator.textContent = "🏢"; // Hotel/PR
                    } else if (propInPropertyData.tenancies > 0) {
                        devIndicator.textContent = "🏠".repeat(propInPropertyData.tenancies); // Houses
                    } else {
                        devIndicator.textContent = "";
                    }
                }
            }
        });
    } else {
        logEvent("updateBoardDynamicElements: gameData.propertyData is NOT an array. Property visual updates will be skipped.", gameData.propertyData);
    }

    // --- Property Swap Flashing Update (Synchronized) ---
    document.querySelectorAll('.space.property, .space.set-property').forEach(spaceEl => {
        const spaceId = parseInt(spaceEl.id.replace('space-', ''));
        // Check if gameData.flashingProperties exists and is an array before trying to use .includes()
        if (gameData.flashingProperties && Array.isArray(gameData.flashingProperties) && gameData.flashingProperties.includes(spaceId)) {
            spaceEl.classList.add('property-flash');
        } else {
            spaceEl.classList.remove('property-flash');
        }
    });
}


function showMoneyChangeEffect(amount, type = 'loss') {
    const moneyFlashDivLocal = document.getElementById('money-flash');
    if (!moneyFlashDivLocal) {
        logEvent("showMoneyChangeEffect: money-flash div not found.");
        return;
    }

    moneyFlashDivLocal.textContent = `${type === 'loss' ? '-' : '+'}£${Math.abs(amount)}`;
    moneyFlashDivLocal.style.color = type === 'loss' ? '#e74c3c' : '#2ecc71';

    moneyFlashDivLocal.classList.add('show');

    setTimeout(() => {
        moneyFlashDivLocal.classList.remove('show');
    }, 1000);

    if (audioContextStarted && toneSynth) {
        try {
            if (type === 'loss') {
                toneSynth.triggerAttackRelease("A3", "16n", Tone.now());
                toneSynth.triggerAttackRelease("F#3", "16n", Tone.now() + 0.07);
            } else {
                toneSynth.triggerAttackRelease("C5", "16n", Tone.now());
                toneSynth.triggerAttackRelease("E5", "16n", Tone.now() + 0.07);
            }
        } catch (e) {
            console.error("Money change sound error:", e);
        }
    }
}

function showRentFlashEffect(payerName, recipientName, amount, propertyName) {
    if (!rentFlashDiv) return;
    rentFlashDiv.innerHTML = `RENT!<br>${payerName} paid £${amount} to ${recipientName}<br>for ${propertyName}`;
    rentFlashDiv.classList.add('show');
    setTimeout(() => {
        rentFlashDiv.classList.remove('show');
    }, 2500);
}


// --- MAIN UI UPDATE FUNCTION (Calls helpers) ---
function updateLocalUIFromFirestore(gameData) {
    if (!currentUserId) {
        logEvent("UpdateLocalUI: currentUserId not set yet, deferring UI update.");
        if(gameStatusMessageP) gameStatusMessageP.textContent = "Authenticating...";
        return;
    }

    if (!gameData || Object.keys(gameData).length === 0) {
        logEvent("UpdateLocalUI: No game data received. Cannot update UI.");
        return;
    }

    if (gameData.preGamePhase &&
        gameData.status === "active" &&
        gameData.hostId === currentUserId &&
        gameData.playerOrder && gameData.playerOrder.length === gameData.maxPlayers &&
        gameData.preGameRolls &&
        gameData.playerOrder.every(pid => gameData.preGameRolls[pid] !== undefined)
    ) {
        const allPlayersRolled = gameData.playerOrder.every(pid => gameData.preGameRolls[pid] !== undefined);
        if (allPlayersRolled) {
            logEvent("Host detected conditions to finalize pre-game. Calling finalizePreGameAsHost.");
            finalizePreGameAsHost();
            return;
        }
    }

    if (gameData.boardLayout && gameData.boardLayout.length > 0) {
        const boardIsMissingOrDifferent = boardLayout.length === 0 ||
            (boardContainer && boardContainer.innerHTML.trim() === '') ||
            JSON.stringify(boardLayout) !== JSON.stringify(gameData.boardLayout);
        if (boardIsMissingOrDifferent) {
            logEvent("UpdateLocalUI: Setting up/refreshing board from Firestore data.");
            setupBoardFromFirestore(gameData);
        } else {
            updateBoardDynamicElements(gameData);
        }
    } else {
        logEvent("UpdateLocalUI: gameData.boardLayout is missing or empty. Board not set up/updated.");
    }

    updateDiceUIDisplay(gameData);
    updatePlayerInfoPanel(gameData);
    updateGameStatusPanel(gameData);
    updateControlsBasedOnTurn(gameData);
    updateUkGovDisplay(gameData.ukGovMoney);

    if (gameData.preGamePhase && gameData.status === "active") {
        updatePreGameRollUI(gameData);
        if (currentUserId === gameData.hostId) {
            automateAIPreGameRolls(gameData);
        }
    } else {
        if(preGameRollArea) preGameRollArea.style.display = 'none';
    }

    if (gameData.status === "finished") {
        handleGameEndUI(gameData);
    }
}

// --- ACTION HANDLERS (Dice, Turn, Property, etc.) ---

async function animatePlayerMove(playerId, startPos, steps, currentBoardLayout) {
    const token = document.getElementById(`player-token-${playerId}`);
    if (!token || !currentBoardLayout || currentBoardLayout.length === 0) return;
    if (steps > 0 && audioContextStarted && toneSynth) {
        try {
            toneSynth.triggerAttackRelease("A5", "16n", Tone.now());
        } catch (e) {
            console.error("Token move sound error:", e);
        }
    }
    let currentVisualPos = startPos;
    const stepDelay = 200;
    for (let i = 0; i < steps; i++) {
        currentVisualPos = (currentVisualPos + 1) % currentBoardLayout.length;
        const nextSpaceEl = document.getElementById(`space-${currentVisualPos}`);
        if (nextSpaceEl) {
            nextSpaceEl.appendChild(token);
            token.classList.remove('token-arrive-step');
            void token.offsetWidth;
            token.classList.add('token-arrive-step');
        }
        await new Promise(resolve => setTimeout(resolve, stepDelay));
    }
}

async function makePaymentTransaction(payerId, recipientId, amount, reason = "Payment") {
    logEvent(`makePaymentTransaction initiated: Payer: ${payerId}, Recipient: ${recipientId}, Amount: £${amount}, Reason: ${reason}`);
    if (!currentGameId || !db) {
        logEvent("makePaymentTransaction: Missing gameId or db connection.");
        throw new Error("Game connection error for payment.");
    }
    if (amount <= 0) {
        logEvent("makePaymentTransaction: Amount is zero or negative. No transaction needed.");
        return { success: true, message: "No payment needed (amount was zero or negative)." };
    }

    const gameDocRef = doc(db, "games", currentGameId);
    let paymentOutcome = { success: false, message: "Payment processing failed." };

    try {
        await runTransaction(db, async (transaction) => {
            const freshGameDoc = await transaction.get(gameDocRef);
            if (!freshGameDoc.exists()) {
                throw new Error("Game document not found during payment transaction.");
            }
            const freshGameData = freshGameDoc.data();
            let updates = { updatedAt: serverTimestamp() };
            let messages = [];

            const payerState = freshGameData.players[payerId];
            if (!payerState) throw new Error(`Payer ${payerId} not found.`);
            if (payerState.isBankrupt) {
                paymentOutcome = { success: true, message: `${payerState.name} is already bankrupt. No payment collected.`};
                messages.push(paymentOutcome.message);
                updates.lastActionMessage = messages.join(" ");
                transaction.update(gameDocRef, updates);
                return;
            }

            let actualAmountPaid = amount;
            if (payerState.money < amount) {
                actualAmountPaid = payerState.money;
                updates[`players.${payerId}.money`] = 0;
                updates[`players.${payerId}.isBankrupt`] = true;
                messages.push(`${payerState.name} could not afford £${amount} for ${reason}. Paid £${actualAmountPaid} and is now BANKRUPT!`);
                logEvent(`${payerState.name} is bankrupt. Assets need to be handled (future implementation).`);
            } else {
                updates[`players.${payerId}.money`] = payerState.money - amount;
                messages.push(`${payerState.name} paid £${amount} ${recipientId === 'bank' ? 'to the bank' : `to ${freshGameData.players[recipientId]?.name || 'another player'}`} for ${reason}.`);
            }

            if (recipientId === 'bank') {
                updates.bankMoney = (freshGameData.bankMoney || 0) + actualAmountPaid;
            } else if (recipientId === 'ukGov') {
                updates.ukGovMoney = (freshGameData.ukGovMoney || 0) + actualAmountPaid;
            } else {
                const recipientState = freshGameData.players[recipientId];
                if (!recipientState) throw new Error(`Recipient ${recipientId} not found.`);
                if (!recipientState.isBankrupt) {
                    updates[`players.${recipientId}.money`] = (recipientState.money || 0) + actualAmountPaid;
                } else {
                    messages.push(`Recipient ${recipientState.name} is bankrupt, payment of £${actualAmountPaid} goes to the bank instead.`);
                    updates.bankMoney = (freshGameData.bankMoney || 0) + actualAmountPaid;
                }
            }

            updates.lastActionMessage = messages.join(" ");
            transaction.update(gameDocRef, updates);
            paymentOutcome = { success: true, message: updates.lastActionMessage, payerBankrupt: updates[`players.${payerId}.isBankrupt`] || false };
        });
        logEvent("makePaymentTransaction: Transaction successful.", paymentOutcome);
        return paymentOutcome;
    } catch (error) {
        console.error("Error during makePaymentTransaction:", error);
        paymentOutcome = { success: false, message: "Payment transaction failed: " + error.message };
        showMessageModal("Payment Error", paymentOutcome.message);
        return paymentOutcome;
    }
}


async function handleRollDiceAction() {
    if (!currentGameId || !localGameData || !localGameData.playerOrder || localGameData.playerOrder[localGameData.currentPlayerIndex] !== currentUserId) {
        showMessageModal("Not your turn", "It's not your turn to roll the dice.");
        return;
    }
    if (localGameData.preGamePhase) {
        showMessageModal("Game Phase Error", "Cannot roll main dice during pre-game roll phase. Use 'Roll to Start'.");
        return;
    }
    if (localGameData.gamePhase !== "main") {
        showMessageModal("Game Phase Error", "Cannot roll dice before the main game has started.");
        return;
    }
    if (!localGameData.players || !localGameData.players[currentUserId] || localGameData.players[currentUserId].isAI) {
        showMessageModal("Error", "Player data not found or AI cannot use this."); return;
    }
    const currentPlayerStateFromLocal = localGameData.players[currentUserId];
    if (currentPlayerStateFromLocal.playerActionTakenThisTurn && !(localGameData.lastDiceRoll?.isDoubles && currentPlayerStateFromLocal.doublesRolledInTurn < 3 && currentPlayerStateFromLocal.doublesRolledInTurn > 0)) {
        showMessageModal("Action Taken", "You've already completed your roll action for this part of the turn.");
        return;
    }
    if (currentPlayerStateFromLocal.inDetention) {
        showMessageModal("In Detention", "You are in detention. Use detention actions (roll for doubles, pay, or use card).");
        return;
    }
    if(rollDiceButton) rollDiceButton.disabled = true;
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const totalRoll = die1 + die2;
    let isDoubles = die1 === die2;
    // --- Display dice value immediately ---
    if (diceFace1Elem && diceFace2Elem && diceTotalDisplayText) {
        diceFace1Elem.textContent = die1;
        diceFace2Elem.textContent = die2;
        diceTotalDisplayText.textContent = ` = ${totalRoll}`;
        const diceDisplayContainer = document.getElementById('actual-dice-faces');
        if (diceDisplayContainer) {
            diceDisplayContainer.classList.remove('dice-animation');
            void diceDisplayContainer.offsetWidth;
            diceDisplayContainer.classList.add('dice-animation');
        }
    }
    if (audioContextStarted && toneSynth) {
        try {
            toneSynth.triggerAttackRelease("C4", "16n", Tone.now());
            setTimeout(() => { if (toneSynth) toneSynth.triggerAttackRelease("E4", "16n", Tone.now() + 0.1); }, 100);
        } catch (e) { console.error("Dice roll sound error:", e); }
    }
    // Optional: Add a small delay so players see dice before movement
    await new Promise(resolve => setTimeout(resolve, 400));
    const playerStartPosForAnim = localGameData.players[currentUserId].position;
    await animatePlayerMove(currentUserId, playerStartPosForAnim, totalRoll, localGameData.boardLayout);

    const gameDocRef = doc(db, "games", currentGameId);
    let landedSpaceIdAfterMove;
    let rentPaymentRequired = false;
    let rentPayerId, rentPropertyId;

    try {
        await runTransaction(db, async (transaction) => {
            const freshGameDoc = await transaction.get(gameDocRef);
            if (!freshGameDoc.exists()) throw new Error("Game document not found during roll.");
            const freshGameData = freshGameDoc.data();

            const playerState = freshGameData.players[currentUserId];
            if (!playerState || playerState.isBankrupt) throw new Error("Player data missing or bankrupt in Firestore during roll.");
            if (freshGameData.playerOrder[freshGameData.currentPlayerIndex] !== currentUserId) {
                throw new Error("Not your turn (checked in transaction).");
            }
            if (playerState.inDetention) {
                throw new Error("Still in detention (checked in transaction).");
            }

            let newPosition = playerState.position;
            let messages = [];
            let updates = {};

            let currentDoublesCount = playerState.doublesRolledInTurn || 0;
            if (isDoubles) {
                currentDoublesCount++;
            } else {
                currentDoublesCount = 0;
            }
            updates[`players.${currentUserId}.doublesRolledInTurn`] = currentDoublesCount;

            if (isDoubles && currentDoublesCount === 3) {
                messages.push(`${playerState.name} rolled 3 doubles! Sent to Detention.`);
                newPosition = detentionCenterSpaceId;
                updates[`players.${currentUserId}.position`] = newPosition;
                updates[`players.${currentUserId}.inDetention`] = true;
                updates[`players.${currentUserId}.missedTurnsInDetention`] = 0;
                updates[`players.${currentUserId}.playerActionTakenThisTurn`] = true;
                updates[`players.${currentUserId}.doublesRolledInTurn`] = 0;
                landedSpaceIdAfterMove = newPosition;
            } else {
                newPosition = (playerState.position + totalRoll) % freshGameData.boardLayout.length;
                updates[`players.${currentUserId}.position`] = newPosition;
                landedSpaceIdAfterMove = newPosition;
                const landedSpace = freshGameData.boardLayout[newPosition];
                messages.push(`${playerState.name} rolled ${totalRoll} (${die1}, ${die2})${isDoubles ? " (Doubles!)" : ""}. Moved to ${landedSpace.name}.`);

                let passedGo = false;
                if (playerState.position + totalRoll >= freshGameData.boardLayout.length && !(isDoubles && currentDoublesCount ===3) && !playerState.inDetention ) {
                    passedGo = true;
                }
                if (passedGo) {
                    const goPayout = 400;
                    updates[`players.${currentUserId}.money`] = (playerState.money || 0) + goPayout;
                    updates.ukGovMoney = (freshGameData.ukGovMoney || 0) - goPayout;
                    updates[`players.${currentUserId}.govReceived`] = (playerState.govReceived || 0) + goPayout;
                    messages.push(`${playerState.name} passed Dole and collected £${goPayout}.`);
                }

                if (landedSpace.type === 'payout' && landedSpace.amount) {
                    const currentMoney = updates[`players.${currentUserId}.money`] !== undefined ? updates[`players.${currentUserId}.money`] : playerState.money;
                    updates[`players.${currentUserId}.money`] = currentMoney + landedSpace.amount;
                    updates.ukGovMoney = (updates.ukGovMoney !== undefined ? updates.ukGovMoney : freshGameData.ukGovMoney) - landedSpace.amount;
                    updates[`players.${currentUserId}.govReceived`] = (updates[`players.${currentUserId}.govReceived`] || playerState.govReceived || 0) + landedSpace.amount;
                    messages.push(`${playerState.name} collected £${landedSpace.amount} from ${landedSpace.name}.`);
                } else if (landedSpace.type === 'tax' && landedSpace.amount) {
                    const currentMoney = updates[`players.${currentUserId}.money`] !== undefined ? updates[`players.${currentUserId}.money`] : playerState.money;
                    if (currentMoney >= landedSpace.amount) {
                        updates[`players.${currentUserId}.money`] = currentMoney - landedSpace.amount;
                        updates.bankMoney = (freshGameData.bankMoney || 0) + landedSpace.amount;
                        messages.push(`${playerState.name} paid £${landedSpace.amount} for ${landedSpace.name}.`);
                    } else {
                        updates[`players.${currentUserId}.money`] = currentMoney - landedSpace.amount; 
                        updates.bankMoney = (freshGameData.bankMoney || 0) + landedSpace.amount;
                        messages.push(`${playerState.name} incurred £${landedSpace.amount} tax for ${landedSpace.name}.`);
                    }
                } else if (landedSpace.type === 'crime_spree' && landedSpace.amount) {
                    const currentMoney = updates[`players.${currentUserId}.money`] !== undefined ? updates[`players.${currentUserId}.money`] : playerState.money;
                    if (currentMoney >= landedSpace.amount) {
                        updates[`players.${currentUserId}.money`] = currentMoney - landedSpace.amount;
                        updates.bankMoney = (freshGameData.bankMoney || 0) + landedSpace.amount;
                        messages.push(`${playerState.name} landed on Crime Spree and was fined £${landedSpace.amount}!`);
                    } else {
                        updates[`players.${currentUserId}.money`] = 0;
                        updates[`players.${currentUserId}.isBankrupt`] = true;
                        updates.bankMoney = (freshGameData.bankMoney || 0) + currentMoney;
                        messages.push(`${playerState.name} fined £${landedSpace.amount} for Crime Spree and is BANKRUPT!`);
                    }
                } else if (landedSpace.type === 'go_to_detention') {
                    updates[`players.${currentUserId}.position`] = detentionCenterSpaceId;
                    updates[`players.${currentUserId}.inDetention`] = true;
                    updates[`players.${currentUserId}.missedTurnsInDetention`] = 0;
                    messages.push(`${playerState.name} was sent to Detention!`);
                    isDoubles = false;
                    currentDoublesCount = 0;
                    updates[`players.${currentUserId}.doublesRolledInTurn`] = 0;
                }

                const propertyDataEntry = freshGameData.propertyData.find(p => p.id === landedSpace.id);
                if ((landedSpace.type === 'property' || landedSpace.type === 'set_property') &&
                    propertyDataEntry && propertyDataEntry.owner !== null && propertyDataEntry.owner !== currentUserId &&
                    !freshGameData.players[propertyDataEntry.owner]?.isBankrupt) {

                    rentPaymentRequired = true;
                    rentPayerId = currentUserId;
                    rentPropertyId = landedSpace.id;
                    messages.push(`${playerState.name} landed on ${landedSpace.name}, owned by ${freshGameData.players[propertyDataEntry.owner]?.name || 'another'}. Rent due.`);
                }
                updates[`players.${currentUserId}.playerActionTakenThisTurn`] = !isDoubles;
            }

            updates.lastDiceRoll = { die1, die2, total: totalRoll, isDoubles };
            updates.lastActionMessage = messages.join(" ");
            updates.updatedAt = serverTimestamp();
            transaction.update(gameDocRef, updates);
        });

        if (rentPaymentRequired && rentPayerId && rentPropertyId !== undefined) {
            logEvent(`Post-roll transaction: Rent payment required for property ID ${rentPropertyId} by player ${rentPayerId}.`);
            const gameSnapshot = await getDoc(gameDocRef);
            if (gameSnapshot.exists()) {
                const currentFreshGameData = gameSnapshot.data();
                const payerStateForRent = currentFreshGameData.players[rentPayerId];
                const propertyForRentLayout = currentFreshGameData.boardLayout.find(s => s.id === rentPropertyId);
                const propertyForRentData = currentFreshGameData.propertyData.find(p => p.id === rentPropertyId);

                if (payerStateForRent && propertyForRentLayout && propertyForRentData && propertyForRentData.owner && propertyForRentData.owner !== rentPayerId) {
                    await payRent(payerStateForRent, propertyForRentData, propertyForRentLayout, currentFreshGameData);
                } else {
                    logEvent("Rent payment skipped: Payer, property, or owner data inconsistent after roll transaction.");
                }
            }
        }


    } catch (error) {
        console.error("Error during roll dice action transaction:", error);
        showMessageModal("Roll Error", "Could not process roll transaction: " + error.message);
        if(rollDiceButton) rollDiceButton.disabled = false;
        return;
    }

    setTimeout(async () => {
        const gameDataForCard = localGameData; 
        if (!gameDataForCard || !gameDataForCard.players || !gameDataForCard.players[currentUserId] || landedSpaceIdAfterMove === undefined) return;

        const playerForCard = gameDataForCard.players[currentUserId];
        if (playerForCard.isBankrupt || playerForCard.inDetention) return; 

        const finalLandedSpace = gameDataForCard.boardLayout[landedSpaceIdAfterMove];
        if (!finalLandedSpace) return;

        const justWentToJailThisMove = localGameData.players[currentUserId]?.inDetention && landedSpaceIdAfterMove === detentionCenterSpaceId;

        if (!justWentToJailThisMove && !rentPaymentRequired) { 
            if (finalLandedSpace.type === 'opportunity') {
                await drawAndShowOpportunityCard(currentUserId);
            } else if (finalLandedSpace.type === 'welfare') {
                await drawAndShowWelfareCard(currentUserId);
            }
        } else {
            logEvent("Card draw skipped due to rent payment or going to jail this move.");
        }
    }, rentPaymentRequired ? 800 : 400);
}

async function handleEndTurnAction() {
    logEvent("handleEndTurnAction called by user/AI: " + currentUserId);

    if (!currentGameId || !localGameData || !currentUserId || !db) {
        logEvent("EndTurn: Exiting - Missing critical global vars.");
        showMessageModal("Error", "Game data or connection issue.");
        return;
    }

    const gameDataForCheck = localGameData;
    const currentPlayerIdFromState = gameDataForCheck.playerOrder[gameDataForCheck.currentPlayerIndex];

    const isHostEndingAIsTurn = gameDataForCheck.players[currentPlayerIdFromState]?.isAI && currentUserId === gameDataForCheck.hostId;
    const isPlayerEndingOwnTurn = currentPlayerIdFromState === currentUserId && !gameDataForCheck.players[currentUserId]?.isAI;

    if (!isHostEndingAIsTurn && !isPlayerEndingOwnTurn) {
        logEvent(`EndTurn: ERROR - Turn mismatch or invalid caller. Current turn player: ${currentPlayerIdFromState}, Caller: ${currentUserId}. Is host ending AI's turn? ${isHostEndingAIsTurn}. Is player ending own turn? ${isPlayerEndingOwnTurn}`);
        showMessageModal("Error", "It's not your turn to end, or invalid action.");
        return;
    }

    const playerEndingTurnId = currentPlayerIdFromState;
    const playerState = gameDataForCheck.players[playerEndingTurnId];
    if (!playerState) {
        logEvent(`EndTurn: Exiting - Player state not found for player ${playerEndingTurnId}.`);
        showMessageModal("Error", "Cannot end turn (player state error).");
        return;
    }
    if (playerState.isBankrupt) {
        logEvent(`EndTurn: Exiting - Player ${playerEndingTurnId} is bankrupt, turn should have been skipped.`);
    } else {
        if (gameDataForCheck.lastDiceRoll?.isDoubles &&
            (playerState.doublesRolledInTurn || 0) > 0 &&
            (playerState.doublesRolledInTurn || 0) < 3 &&
            !playerState.inDetention &&
            !playerState.playerActionTakenThisTurn) {
            logEvent(`EndTurn: Exiting for ${playerEndingTurnId} - Player must roll again (doubles).`);
            if (!playerState.isAI) showMessageModal("Doubles!", "You rolled doubles, please roll again before ending your turn!");
            return;
        }
        if (!playerState.playerActionTakenThisTurn && !playerState.inDetention) {
            logEvent(`EndTurn: Exiting for ${playerEndingTurnId} - Player has not taken their main action. playerActionTakenThisTurn is false.`);
            if (!playerState.isAI) showMessageModal("Action Required", "You must take an action (e.g., roll dice) before ending your turn.");
            return;
        }
    }

    logEvent(`EndTurn: Player ${playerEndingTurnId} is proceeding to end turn transaction.`);
    if(endTurnButton && isPlayerEndingOwnTurn) endTurnButton.disabled = true;

    const gameDocRef = doc(db, "games", currentGameId);
    try {
        await runTransaction(db, async (transaction) => {
            const freshGameDoc = await transaction.get(gameDocRef);
            if (!freshGameDoc.exists()) throw new Error("Game not found for end turn.");
            const freshGameData = freshGameDoc.data();

            const freshCurrentPlayerId = freshGameData.playerOrder[freshGameData.currentPlayerIndex];
            if (freshCurrentPlayerId !== playerEndingTurnId) {
                logEvent(`EndTurn TXN: Turn already changed. Expected to end for ${playerEndingTurnId}, but current is ${freshCurrentPlayerId}. Aborting.`);
                return;
            }
            const freshPlayerState = freshGameData.players[playerEndingTurnId];
            if (!freshPlayerState) {
                logEvent(`EndTurn TXN: Player ${playerEndingTurnId} missing. Aborting.`);
                return;
            }

            if (!freshPlayerState.isBankrupt) {
                if (freshGameData.lastDiceRoll?.isDoubles &&
                    (freshPlayerState.doublesRolledInTurn || 0) > 0 &&
                    (freshPlayerState.doublesRolledInTurn || 0) < 3 &&
                    !freshPlayerState.inDetention &&
                    !freshPlayerState.playerActionTakenThisTurn) {
                    logEvent(`EndTurn TXN for ${playerEndingTurnId}: Must roll again (doubles) based on fresh data. Aborting.`);
                    return;
                }
                if (!freshPlayerState.playerActionTakenThisTurn && !freshPlayerState.inDetention) {
                    logEvent(`EndTurn TXN for ${playerEndingTurnId}: Player action not taken in fresh data. Aborting. playerActionTakenThisTurn is false.`);
                    return;
                }
            }


            let updates = {};
            updates[`players.${playerEndingTurnId}.playerActionTakenThisTurn`] = false;
            updates[`players.${playerEndingTurnId}.doublesRolledInTurn`] = 0;

            let nextPlayerIndex = (freshGameData.currentPlayerIndex + 1) % freshGameData.playerOrder.length;
            let nextPlayerId = freshGameData.playerOrder[nextPlayerIndex];
            let attempts = 0;
            const maxAttempts = freshGameData.playerOrder.length;

            while (freshGameData.players[nextPlayerId]?.isBankrupt && attempts < maxAttempts) {
                logEvent(`EndTurn TXN: Skipping bankrupt player ${freshGameData.players[nextPlayerId]?.name}.`);
                updates[`players.${nextPlayerId}.playerActionTakenThisTurn`] = false;
                updates[`players.${nextPlayerId}.doublesRolledInTurn`] = 0;

                nextPlayerIndex = (nextPlayerIndex + 1) % freshGameData.playerOrder.length;
                nextPlayerId = freshGameData.playerOrder[nextPlayerIndex];
                attempts++;
            }

            const nonBankruptPlayers = freshGameData.playerOrder.filter(pid => !freshGameData.players[pid]?.isBankrupt);

            if (nonBankruptPlayers.length <= 1 && freshGameData.playerOrder.length > 1) {
                updates.status = "finished";
                const winnerName = nonBankruptPlayers.length === 1 ? freshGameData.players[nonBankruptPlayers[0]].name : "No one";
                updates.lastActionMessage = `Game Over! ${winnerName} is the winner!`;
                logEvent(`Game ended. Winner: ${winnerName}`);
            } else if (attempts >= maxAttempts && nonBankruptPlayers.length > 1) {
                logEvent("Error in turn progression: Loop completed but non-bankrupt players should exist.");
                updates.status = "finished";
                updates.lastActionMessage = "Error finding next player. Game Over.";
            } else if (nonBankruptPlayers.length === 0 && freshGameData.playerOrder.length >=1){
                updates.status = "finished";
                updates.lastActionMessage = "All players are bankrupt! Game Over!";
            }
            else {
                updates.currentPlayerIndex = nextPlayerIndex;
                updates.lastActionMessage = `${freshPlayerState.name} ${freshPlayerState.isAI ? "(AI)" : ""} ended their turn. It's now ${freshGameData.players[nextPlayerId].name}${freshGameData.players[nextPlayerId].isAI ? " (AI)" : ""}'s turn.`;
                updates.lastDiceRoll = null;
            }

            updates.updatedAt = serverTimestamp();
            transaction.update(gameDocRef, updates);
            logEvent(`EndTurn TXN: ${freshPlayerState.name} ended turn. Next is ${nextPlayerId || 'N/A'}.`);
        });
    } catch (error) {
        console.error("Error ending turn (transaction phase):", error);
        showMessageModal("End Turn Error", "Could not end turn: " + error.message);
    }
}

async function handleBuyPropertyAction() {
    logEvent("BuyProp: Action initiated by user: " + currentUserId);

    if (!currentGameId || !localGameData || !currentUserId || !db) {
        logEvent("BuyProp: Exiting - Missing critical global vars.");
        showMessageModal("Error", "Game data or connection issue.");
        return;
    }
    if (localGameData.players[currentUserId]?.isAI) {
        logEvent("BuyProp: AI cannot use this button."); return;
    }

    const currentSnapshotGameData = localGameData;
    const currentPlayerIdFromOrder = currentSnapshotGameData.playerOrder[currentSnapshotGameData.currentPlayerIndex];
    logEvent("BuyProp: Current turn player from order: " + currentPlayerIdFromOrder + ", current user: " + currentUserId);

    if (currentPlayerIdFromOrder !== currentUserId) {
        logEvent(`BuyProp: Exiting - Not current player's turn. Expected: ${currentPlayerIdFromOrder}`);
        showMessageModal("Error", "Not your turn to buy property.");
        return;
    }

    const playerState = currentSnapshotGameData.players[currentUserId];
    if (!playerState) {
        logEvent("BuyProp: Exiting - Player state not found for user: " + currentUserId);
        showMessageModal("Error", "Player data not found.");
        return;
    }
    if (playerState.isBankrupt) {
        logEvent(`BuyProp: Exiting - Player ${currentUserId} is bankrupt.`);
        showMessageModal("Error", "Cannot buy property (player is bankrupt).");
        return;
    }

    logEvent("BuyProp: Player state check passed.");

    if (!currentSnapshotGameData.lastDiceRoll && !playerState.playerActionTakenThisTurn) {
        logEvent("BuyProp: Exiting - Player has not rolled/landed yet in this turn segment.");
        showMessageModal("Action Required", "You must roll and land on a space before buying property.");
        return;
    }

    const currentPosition = playerState.position;
    const spaceDetails = currentSnapshotGameData.boardLayout[currentPosition];
    logEvent("BuyProp: Attempting to buy space:", { position: currentPosition, spaceDetails });

    const propertyDataEntry = Array.isArray(currentSnapshotGameData.propertyData) ?
        currentSnapshotGameData.propertyData.find(p => p.id === currentPosition) : null;

    if (!spaceDetails || !propertyDataEntry || (spaceDetails.type !== 'property' && spaceDetails.type !== 'set_property')) {
        logEvent(`BuyProp: Exiting - Not a buyable property.`);
        showMessageModal("Invalid Space", "Not a buyable property space.");
        return;
    }

    if (propertyDataEntry.owner) {
        logEvent(`BuyProp: Exiting - Property already owned by ${propertyDataEntry.owner}`);
        showMessageModal("Owned", `This property (${spaceDetails.name}) is already owned by ${currentSnapshotGameData.players[propertyDataEntry.owner]?.name || 'another player'}.`);
        return;
    }

    let price = spaceDetails.price;
    let usedVoucher = false;
    if (playerState.hasHousingVoucher && spaceDetails.type === 'property') {
        price = Math.round(price * 0.75);
        usedVoucher = true;
        logEvent("BuyProp: Housing voucher applied. New price: " + price);
    }

    if (playerState.money < price) {
        logEvent(`BuyProp: Exiting - Insufficient funds. Needs: ${price}, Has: ${playerState.money}`);
        showMessageModal("Insufficient Funds", `You need £${price} to buy ${spaceDetails.name}, but you only have £${playerState.money}.`);
        return;
    }

    logEvent("BuyProp: All pre-transaction checks passed. Disabling button and starting transaction.");
    if(buyPropertyButton) buyPropertyButton.disabled = true;

    const gameDocRef = doc(db, "games", currentGameId);
    try {
        await runTransaction(db, async (transaction) => {
            logEvent("BuyProp TXN: Inside transaction.");
            const freshGameDoc = await transaction.get(gameDocRef);
            if (!freshGameDoc.exists()) {
                logEvent("BuyProp TXN: Game doc not found.");
                throw new Error("Game not found for buying property.");
            }
            const freshGameData = freshGameDoc.data();
            logEvent("BuyProp TXN: Fetched fresh game data.");

            if (freshGameData.playerOrder[freshGameData.currentPlayerIndex] !== currentUserId) {
                logEvent("BuyProp TXN: Not player's turn in fresh data.");
                throw new Error("Not your turn (checked in transaction).");
            }
            const freshPlayerState = freshGameData.players[currentUserId];
            if (!freshPlayerState || freshPlayerState.isBankrupt) {
                logEvent("BuyProp TXN: Player state error/bankrupt in fresh data.");
                throw new Error("Player error in transaction.");
            }

            if (!freshGameData.lastDiceRoll && !freshPlayerState.playerActionTakenThisTurn) {
                logEvent("BuyProp TXN: Player has not rolled/landed (fresh data).");
                throw new Error("Player action not completed (checked in transaction).");
            }

            const freshCurrentPosition = freshPlayerState.position;
            const actualSpaceDetails = freshGameData.boardLayout[freshCurrentPosition];
            logEvent("BuyProp TXN: Fresh player position: " + freshCurrentPosition);

            if (!Array.isArray(freshGameData.propertyData)) {
                logEvent("BuyProp TXN: propertyData is not an array in fresh data.");
                throw new Error("Property data in Firestore is not an array. Cannot buy.");
            }
            const freshPropertyDataEntry = freshGameData.propertyData.find(p => p.id === freshCurrentPosition);

            if (!actualSpaceDetails || !freshPropertyDataEntry || (actualSpaceDetails.type !== 'property' && actualSpaceDetails.type !== 'set_property')) {
                logEvent("BuyProp TXN: Not a buyable space in fresh data.");
                throw new Error("Not a buyable property space (checked in transaction).");
            }
            if (freshPropertyDataEntry.owner) {
                logEvent("BuyProp TXN: Property already owned in fresh data by " + freshPropertyDataEntry.owner);
                throw new Error(`Property (${actualSpaceDetails.name}) already owned by ${freshGameData.players[freshPropertyDataEntry.owner]?.name || 'another player'} (checked in transaction).`);
            }

            let actualPrice = actualSpaceDetails.price;
            let actualUsedVoucher = false;
            if (freshPlayerState.hasHousingVoucher && actualSpaceDetails.type === 'property') {
                actualPrice = Math.round(actualPrice * 0.75);
                actualUsedVoucher = true;
            }
            if (freshPlayerState.money < actualPrice) {
                logEvent("BuyProp TXN: Insufficient funds in fresh data.");
                throw new Error(`Insufficient funds (£${freshPlayerState.money} vs £${actualPrice}) for ${actualSpaceDetails.name} (checked in transaction).`);
            }

            let updates = {};
            updates[`players.${currentUserId}.money`] = freshPlayerState.money - actualPrice;
            updates[`players.${currentUserId}.propertiesOwned`] = arrayUnion(freshCurrentPosition);
            if (actualUsedVoucher) {
                updates[`players.${currentUserId}.hasHousingVoucher`] = false;
            }

            const updatedPropertyData = freshGameData.propertyData.map(prop => {
                if (prop.id === freshCurrentPosition) {
                    return { ...prop, owner: currentUserId };
                }
                return prop;
            });
            updates.propertyData = updatedPropertyData;
            updates.bankMoney = (freshGameData.bankMoney || 0) + actualPrice;

            updates.lastActionMessage = `${freshPlayerState.name} bought ${actualSpaceDetails.name} for £${actualPrice}${actualUsedVoucher ? " (with voucher)" : ""}.`;
            updates.updatedAt = serverTimestamp();

            if (!freshGameData.lastDiceRoll?.isDoubles) {
                updates[`players.${currentUserId}.playerActionTakenThisTurn`] = true;
                logEvent("BuyProp TXN: Non-doubles roll, setting playerActionTakenThisTurn to true.");
            } else {
                updates[`players.${currentUserId}.playerActionTakenThisTurn`] = false;
                logEvent("BuyProp TXN: Doubles roll, playerActionTakenThisTurn explicitly set to false to ensure re-roll.");
            }


            transaction.update(gameDocRef, updates);
            logEvent("BuyProp TXN: Transaction update successful.");

            if (audioContextStarted && toneSynth) {
                try {
                    toneSynth.triggerAttackRelease("A3", "16n", Tone.now());
                    toneSynth.triggerAttackRelease("F#3", "16n", Tone.now() + 0.07);
                } catch(e){ console.error("Buy property sound error:", e); }
            }
        });
        logEvent("BuyProp: Transaction completed successfully.");
    } catch (error) {
        console.error("Error buying property (transaction phase):", error);
        showMessageModal("Buy Property Error", "Could not buy property: " + error.message);
    } finally {
        logEvent("BuyProp: Action finished.");
    }
}

async function handlePreGameRollAction(playerIdToRoll = currentUserId) {
    if (!currentGameId || !localGameData || !localGameData.preGamePhase) {
        showMessageModal("Error", "Not in pre-game roll phase.");
        return false;
    }
    const playerToRollData = localGameData.players[playerIdToRoll];
    if (!playerToRollData) {
        showMessageModal("Error", "Player data not found for roll.");
        return false;
    }

    if (Object.values(localGameData.players).filter(p => !p.isAI).length < localGameData.numHumanPlayers) {
        if (!playerToRollData.isAI) showMessageModal("Waiting", "Waiting for all human players to join before rolling.");
        return false;
    }
    if (localGameData.playerOrder.length < localGameData.maxPlayers) {
        if (!playerToRollData.isAI) showMessageModal("Waiting", "Waiting for game to fully initialize with all players.");
        return false;
    }

    if (localGameData.preGameRolls && localGameData.preGameRolls[playerIdToRoll] !== undefined) {
        if (!playerToRollData.isAI) showMessageModal("Already Rolled", "You have already rolled for starting position.");
        return false;
    }

    let nextToRollInPreGame = null;
    const sortedByJoinOrderForPreGame = [...localGameData.playerOrder].sort((a,b) => (localGameData.players[a]?.order || 0) - (localGameData.players[b]?.order || 0));
    for (const pid of sortedByJoinOrderForPreGame) {
        if (!localGameData.preGameRolls || localGameData.preGameRolls[pid] === undefined) {
            nextToRollInPreGame = pid;
            break;
        }
    }
    if (nextToRollInPreGame !== playerIdToRoll) {
        if (!playerToRollData.isAI) showMessageModal("Wait", "It's not your turn to roll for starting position.");
        return false;
    }


    if(preGameRollButton && !playerToRollData.isAI) preGameRollButton.disabled = true;
    const roll = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;

    const gameDocRef = doc(db, "games", currentGameId);
    try {
        await runTransaction(db, async (transaction) => {
            const freshGameDoc = await transaction.get(gameDocRef);
            if (!freshGameDoc.exists()) throw new Error("Game not found for pre-game roll.");
            const freshGameData = freshGameDoc.data();
            if (!freshGameData.players || !freshGameData.players[playerIdToRoll]) throw new Error("Player data missing in Firestore for pre-game roll.");
            if (!freshGameData.preGamePhase) throw new Error("Pre-game phase ended.");
            if (freshGameData.preGameRolls && freshGameData.preGameRolls[playerIdToRoll] !== undefined) {
                throw new Error("Already rolled (checked in transaction).");
            }

            let updates = {};
            updates[`preGameRolls.${playerIdToRoll}`] = roll;
            updates.lastActionMessage = `${freshGameData.players[playerIdToRoll].name} ${freshGameData.players[playerIdToRoll].isAI ? "(AI)" : ""} rolled ${roll} for starting order.`;
            updates.updatedAt = serverTimestamp();

            const currentPreGameRollsWithThis = { ...(freshGameData.preGameRolls || {}), [playerIdToRoll]: roll };
            const allPlayersInOrder = freshGameData.playerOrder || [];
            const allHaveRolled = allPlayersInOrder.length > 0 &&
                allPlayersInOrder.length === freshGameData.maxPlayers &&
                allPlayersInOrder.every(pid => currentPreGameRollsWithThis[pid] !== undefined);


            if (allHaveRolled) {
                updates.lastActionMessage += " All players rolled.";
                if (freshGameData.hostId === currentUserId || playerToRollData.isAI) {
                    logEvent("All pre-game rolls complete. Host will finalize order.");
                }
            }
            transaction.update(gameDocRef, updates);
        });
        return true;
    } catch (error) {
        console.error("Error during pre-game roll:", error);
        if (!playerToRollData.isAI) {
            showMessageModal("Roll Error", "Could not process pre-game roll: " + error.message);
            if(preGameRollButton) preGameRollButton.disabled = false;
        }
        return false;
    }
}

async function automateAIPreGameRolls(gameData) {
    if (currentUserId !== gameData.hostId || !gameData.preGamePhase) return;

    for (const playerId of gameData.playerOrder) {
        const player = gameData.players[playerId];
        if (player.isAI && (gameData.preGameRolls === undefined || gameData.preGameRolls[playerId] === undefined)) {
            logEvent(`Host automating pre-game roll for AI: ${player.name}`);
            await handlePreGameRollAction(playerId);
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
}


// --- Event Listeners ---
createGameButton.onclick = handleCreateGame;
joinGameButton.onclick = handleJoinGame;
rollDiceButton.onclick = handleRollDiceAction;
preGameRollButton.onclick = () => handlePreGameRollAction();
endTurnButton.onclick = handleEndTurnAction;
buyPropertyButton.onclick = handleBuyPropertyAction;
developPropertyButton.onclick = () => {
    if (localGameData && currentUserId && localGameData.players && localGameData.players[currentUserId] && !localGameData.players[currentUserId].isAI) {
        showDevelopPropertyOptions(localGameData.players[currentUserId], localGameData);
    }
};
closeDevelopButton.onclick = () => {
    if(developPropertyContainer) developPropertyContainer.style.display = 'none';
};

generatedGameIdSpan.onclick = () => {
    if (generatedGameIdSpan.textContent) {
        const textArea = document.createElement("textarea");
        textArea.value = generatedGameIdSpan.textContent;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showMessageModal("Copied!", "Game ID copied to clipboard.");
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            showMessageModal("Copy Failed", "Could not copy Game ID automatically. Please select and copy manually.");
        }
        document.body.removeChild(textArea);
    }
};

function shuffleDeck(deck) {
    let newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
}

function canPlayerDevelopAnyProperty(playerState, gameData) {
    if (!playerState || playerState.isBankrupt || !gameData || !Array.isArray(gameData.propertyData) || !gameData.boardLayout) return false;

    return playerState.propertiesOwned.some(propId => {
        const propDetails = gameData.propertyData.find(p => p.id === propId);
        const propLayout = gameData.boardLayout.find(s => s.id === propId);

        if (!propDetails || !propLayout || propLayout.type !== 'property') return false;
        if (propDetails.owner !== playerState.id || propDetails.permanentResidence) return false;

        const groupPropertiesLayout = gameData.boardLayout.filter(s => s.groupId === propLayout.groupId && s.type === 'property');
        const ownsAllInGroup = groupPropertiesLayout.every(gpLayout => {
            const gpDataForCheck = gameData.propertyData.find(pd => pd.id === gpLayout.id);
            return gpDataForCheck && gpDataForCheck.owner === playerState.id;
        });
        if (!ownsAllInGroup) return false;

        if (PR_IS_FIFTH_DEVELOPMENT) {
            return propDetails.tenancies < MAX_TENANCIES_BEFORE_PR || (propDetails.tenancies === MAX_TENANCIES_BEFORE_PR && !propDetails.permanentResidence);
        } else {
            return (propDetails.tenancies < MAX_TENANCIES_BEFORE_PR) || (!propDetails.permanentResidence);
        }
    });
}

function setupDetentionActionsUI(playerState, gameData) {
    if (!playerState || !playerState.inDetention || !detentionActionsDiv || playerState.isAI) return;
    detentionActionsDiv.innerHTML = '';

    const canTakeAction = gameData.playerOrder[gameData.currentPlayerIndex] === currentUserId && !playerState.playerActionTakenThisTurn;

    if (playerState.getOutOfDetentionCards > 0) {
        const useCardBtn = document.createElement('button');
        useCardBtn.textContent = "Use Legal Aid Card";
        useCardBtn.disabled = !canTakeAction;
        useCardBtn.onclick = async () => {
            const gameDocRef = doc(db, "games", currentGameId);
            try {
                await updateDoc(gameDocRef, {
                    [`players.${currentUserId}.getOutOfDetentionCards`]: playerState.getOutOfDetentionCards - 1,
                    [`players.${currentUserId}.inDetention`]: false,
                    [`players.${currentUserId}.missedTurnsInDetention`]: 0,
                    [`players.${currentUserId}.playerActionTakenThisTurn`]: false,
                    lastActionMessage: `${playerState.name} used a Legal Aid card and is free. Roll to move.`,
                    updatedAt: serverTimestamp()
                });
            } catch (e) { showMessageModal("Error", "Failed to use card: " + e.message); }
        };
        detentionActionsDiv.appendChild(useCardBtn);
    }

    const fineAmount = 50;
    if (playerState.money >= fineAmount) {
        const payFineBtn = document.createElement('button');
        payFineBtn.textContent = `Pay £${fineAmount} Fine`;
        payFineBtn.disabled = !canTakeAction;
        payFineBtn.onclick = async () => {
            const gameDocRef = doc(db, "games", currentGameId);
            try {
                await updateDoc(gameDocRef, {
                    [`players.${currentUserId}.money`]: playerState.money - fineAmount,
                    [`players.${currentUserId}.inDetention`]: false,
                    [`players.${currentUserId}.missedTurnsInDetention`]: 0,
                    [`players.${currentUserId}.playerActionTakenThisTurn`]: false,
                    bankMoney: (gameData.bankMoney || 0) + fineAmount,
                    lastActionMessage: `${playerState.name} paid £${fineAmount} fine and is free. Roll to move.`,
                    updatedAt: serverTimestamp()
                });
            } catch (e) { showMessageModal("Error", "Failed to pay fine: " + e.message); }
        };
        detentionActionsDiv.appendChild(payFineBtn);
    }

    const rollDoublesBtn = document.createElement('button');
    rollDoublesBtn.textContent = "Roll for Doubles (Exit Jail)";
    rollDoublesBtn.disabled = !canTakeAction;
    rollDoublesBtn.onclick = async () => {
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        const isDoubles = die1 === die2;
        const totalRoll = die1 + die2;

        const gameDocRef = doc(db, "games", currentGameId);
        let updates = { updatedAt: serverTimestamp(), lastDiceRoll: {die1, die2, total: totalRoll, isDoubles: isDoubles} };
        let missedTurns = playerState.missedTurnsInDetention || 0;

        if (isDoubles) {
            updates[`players.${currentUserId}.inDetention`] = false;
            updates[`players.${currentUserId}.missedTurnsInDetention`] = 0;
            updates[`players.${currentUserId}.playerActionTakenThisTurn`] = false;
            updates.lastActionMessage = `${playerState.name} rolled doubles (${die1},${die2}) and is out of Detention! Roll again to move.`;
        } else {
            missedTurns++;
            updates[`players.${currentUserId}.missedTurnsInDetention`] = missedTurns;
            updates[`players.${currentUserId}.playerActionTakenThisTurn`] = true;
            if (missedTurns >= 3) {
                updates[`players.${currentUserId}.inDetention`] = false;
                updates[`players.${currentUserId}.missedTurnsInDetention`] = 0;
                if (playerState.money >= fineAmount) {
                    updates[`players.${currentUserId}.money`] = (playerState.money || 0) - fineAmount;
                    updates.bankMoney = (gameData.bankMoney || 0) + fineAmount;
                    updates.lastActionMessage = `${playerState.name} failed to roll doubles for 3 turns, paid £${fineAmount} fine and is out. Must roll to move on their next turn.`;
                } else {
                    updates[`players.${currentUserId}.money`] = 0;
                    updates.bankMoney = (gameData.bankMoney || 0) + playerState.money;
                    updates[`players.${currentUserId}.isBankrupt`] = true;
                    updates.lastActionMessage = `${playerState.name} failed to roll doubles for 3 turns, couldn't pay £${fineAmount} fine, and is BANKRUPT!`;
                }
                updates[`players.${currentUserId}.playerActionTakenThisTurn`] = false;
            } else {
                updates.lastActionMessage = `${playerState.name} failed to roll doubles (${die1},${die2}) in detention. Still in detention. ${3 - missedTurns} attempt(s) left.`;
            }
        }
        try {
            await updateDoc(gameDocRef, updates);
        } catch (e) { showMessageModal("Error", "Failed to roll for doubles in detention: " + e.message); }
    };
    detentionActionsDiv.appendChild(rollDoublesBtn);
}

function showDevelopPropertyOptions(playerState, gameData) {
    if (!developPropertyContainer || !developPropertyOptionsDiv || !developPropertyNameH3 || playerState.isAI) return;

    developPropertyOptionsDiv.innerHTML = '';
    developPropertyNameH3.textContent = "Develop Property";

    let canDevelopAnything = false;

    playerState.propertiesOwned.forEach(propId => {
        const propLayout = gameData.boardLayout.find(s => s.id === propId);
        const propData = gameData.propertyData.find(p => p.id === propId);

        if (propLayout && propData && propLayout.type === 'property' && propData.owner === playerState.id) {
            const groupPropertiesLayout = gameData.boardLayout.filter(s => s.groupId === propLayout.groupId && s.type === 'property');
            const ownsAllInGroup = groupPropertiesLayout.every(gpLayout => {
                const gpDataForCheck = gameData.propertyData.find(pd => pd.id === gpLayout.id);
                return gpDataForCheck && gpDataForCheck.owner === playerState.id;
            });

            if (ownsAllInGroup) {
                const houseCost = propLayout.houseCost || 50;
                if (!propData.permanentResidence && propData.tenancies < MAX_TENANCIES_BEFORE_PR) {
                    const addTenancyButton = document.createElement('button');
                    addTenancyButton.textContent = `Add Tenancy to ${propLayout.name} (£${houseCost})`;
                    addTenancyButton.disabled = playerState.money < houseCost;
                    addTenancyButton.onclick = () => handleConfirmDevelopment(propId, 'tenancy', houseCost);
                    developPropertyOptionsDiv.appendChild(addTenancyButton);
                    canDevelopAnything = true;
                }
                if (PR_IS_FIFTH_DEVELOPMENT && !propData.permanentResidence && propData.tenancies === MAX_TENANCIES_BEFORE_PR) {
                    const buildPRButton = document.createElement('button');
                    buildPRButton.textContent = `Build PR on ${propLayout.name} (£${houseCost})`;
                    buildPRButton.disabled = playerState.money < houseCost;
                    buildPRButton.onclick = () => handleConfirmDevelopment(propId, 'pr', houseCost);
                    developPropertyOptionsDiv.appendChild(buildPRButton);
                    canDevelopAnything = true;
                }
            }
        }
    });

    if (!canDevelopAnything) {
        developPropertyOptionsDiv.innerHTML = '<p>No properties currently eligible for development.</p>';
    }
    developPropertyContainer.style.display = 'block';
}

async function handleConfirmDevelopment(propertyId, developmentType, cost) {
    logEvent(`handleConfirmDevelopment called for prop: ${propertyId}, type: ${developmentType}, cost: ${cost}`);
    if (!currentGameId || !localGameData || !currentUserId || !db) {
        showMessageModal("Error", "Game data or connection issue.");
        return;
    }
    if (localGameData.players[currentUserId]?.isAI) {
        logEvent("AI attempted to call handleConfirmDevelopment directly. Skipping."); return;
    }

    const gameDocRef = doc(db, "games", currentGameId);
    try {
        await runTransaction(db, async (transaction) => {
            const freshGameDoc = await transaction.get(gameDocRef);
            if (!freshGameDoc.exists()) throw new Error("Game not found for development.");

            const freshGameData = freshGameDoc.data();
            const playerState = freshGameData.players[currentUserId];
            const propLayout = freshGameData.boardLayout.find(s => s.id === propertyId);
            const propDataIndex = freshGameData.propertyData.findIndex(p => p.id === propertyId);

            if (propDataIndex === -1 || !propLayout || !playerState) {
                throw new Error("Property or player data not found for development.");
            }
            const propData = freshGameData.propertyData[propDataIndex];

            if (freshGameData.playerOrder[freshGameData.currentPlayerIndex] !== currentUserId) {
                throw new Error("Not your turn to develop.");
            }
            if (propData.owner !== currentUserId) {
                throw new Error("You do not own this property.");
            }
            if (propLayout.type !== 'property') {
                throw new Error("This type of property cannot be developed.");
            }

            const groupPropertiesLayout = freshGameData.boardLayout.filter(s => s.groupId === propLayout.groupId && s.type === 'property');
            const ownsAllInGroup = groupPropertiesLayout.every(gpLayout => {
                const gpDataForCheck = freshGameData.propertyData.find(pd => pd.id === gpLayout.id);
                return gpDataForCheck && gpDataForCheck.owner === currentUserId;
            });
            if (!ownsAllInGroup) {
                throw new Error(`You must own all properties in the ${propLayout.color || propLayout.groupId} group to develop.`);
            }

            let newTenancies = propData.tenancies;
            let newPR = propData.permanentResidence;
            let developmentMessage = "";

            if (developmentType === 'tenancy') {
                if (propData.permanentResidence) throw new Error("Cannot add tenancies to a property with Permanent Residence.");
                if (propData.tenancies >= MAX_TENANCIES_BEFORE_PR) throw new Error("Maximum tenancies reached before PR.");
                newTenancies++;
                developmentMessage = `added a tenancy to ${propLayout.name}`;
            } else if (developmentType === 'pr') {
                if (!PR_IS_FIFTH_DEVELOPMENT || propData.permanentResidence) throw new Error("Permanent Residence already built or not applicable.");
                if (propData.tenancies < MAX_TENANCIES_BEFORE_PR) throw new Error(`Must have ${MAX_TENANCIES_BEFORE_PR} tenancies to build PR.`);
                newPR = true;
                developmentMessage = `built Permanent Residence on ${propLayout.name}`;
            } else {
                throw new Error("Invalid development type.");
            }

            if (playerState.money < cost) {
                throw new Error(`Insufficient funds. Need £${cost}.`);
            }

            const updates = {};
            updates[`players.${currentUserId}.money`] = playerState.money - cost;

            const updatedPropertyDataArray = freshGameData.propertyData.map((p, index) => {
                if (index === propDataIndex) {
                    return { ...p, tenancies: newTenancies, permanentResidence: newPR };
                }
                return p;
            });
            updates.propertyData = updatedPropertyDataArray;
            updates.bankMoney = (freshGameData.bankMoney || 0) + cost;

            updates.lastActionMessage = `${playerState.name} ${developmentMessage} for £${cost}.`;
            updates.updatedAt = serverTimestamp();

            transaction.update(gameDocRef, updates);
            logEvent("Development successful in transaction:", updates);
        });

        developPropertyContainer.style.display = 'none';

    } catch (error) {
        console.error("Error confirming development:", error);
        showMessageModal("Development Error", error.message);
    }
}


// --- Initial Load ---
document.addEventListener('DOMContentLoaded', async () => {
    if (firebaseConfigToUse.apiKey === "YOUR_API_KEY" || !firebaseConfigToUse.projectId) {
        onlineSetupMessage.textContent = "CRITICAL: Firebase is not configured. Please update firebaseConfigToUse in the script.";
        console.error("CRITICAL: Firebase configuration is a placeholder. Update it with your actual Firebase project details.");
        createGameButton.disabled = true;
        joinGameButton.disabled = true;
        showMessageModal("SETUP REQUIRED", "Firebase is not configured. Online features are disabled. See console for details.");
        return;
    }
    reformatBoardLayout();
    await initializeFirebase();

    const overlay = document.querySelector('.overlay');
    if(overlay) overlay.style.display = 'none';

    // Global single click listener for swap interaction (confirm/cancel)
    document.addEventListener('click', async function(e) {
        if (!window._propertySwapState || !window._propertySwapState.swapActive || !window._propertySwapState.cardA || !window._propertySwapState.cardB) {
            // Only proceed if a full proposal is active (cardA and cardB selected)
            return;
        }
    
        const clickedElement = e.target.closest('.space.property, .space.set-property');
        if (!clickedElement) return; // Clicked outside a property
    
        const clickedPropId = parseInt(clickedElement.id.replace('space-', ''));
        const gameDataForClick = localGameData; // Use a stable snapshot
        const gameDocRef = doc(db, "games", currentGameId);
    
        const { cardA, cardB, swapInitiatorPlayerId } = window._propertySwapState;
    
        // Check if the clicked property is one of the two involved in the active swap
        if (clickedPropId === cardA.propId || clickedPropId === cardB.propId) {
            // Ensure the player clicking is one of the two involved in the swap
            if (currentUserId === cardA.playerId || currentUserId === cardB.playerId) {
                logEvent(`Swap INTERACTION (click): Player ${currentUserId} clicked flashing property ${clickedPropId}.`);
    
                if (window._propertySwapState.swapTimeout) {
                    clearTimeout(window._propertySwapState.swapTimeout);
                    window._propertySwapState.swapTimeout = null;
                }
    
                // If Player A (initiator) clicks their own card (cardA) OR Player B (target) clicks Player A's card (cardA) -> CANCEL
                if (clickedPropId === cardA.propId && (currentUserId === cardA.playerId || currentUserId === cardB.playerId) ) {
                     logEvent(`Swap CANCELLED by ${currentUserId} clicking initiator's card (${cardA.propId}).`);
                     await updateDoc(gameDocRef, {
                         flashingProperties: [],
                         lastActionMessage: `Property swap cancelled by ${gameDataForClick.players[currentUserId]?.name || 'a player'}.`,
                         updatedAt: serverTimestamp()
                     });
                }
                // If Player B (target) clicks their own card (cardB) OR Player A (initiator) clicks Player B's card (cardB) -> CONFIRM SWAP
                else if (clickedPropId === cardB.propId && (currentUserId === cardB.playerId || currentUserId === cardA.playerId)) {
                    logEvent(`Swap CONFIRMED by ${currentUserId} clicking target's card (${cardB.propId}). Performing swap.`);
                    await performPropertySwap(cardA, cardB, gameDataForClick);
                }
                
                // Reset global state after any valid interaction (confirm or cancel)
                window._propertySwapState = { cardA: null, cardB: null, swapInitiatorPlayerId: null, swapActive: false, swapTimeout: null };
    
            } else {
                logEvent(`Swap Click Ignored: Player ${currentUserId} (not involved) clicked a flashing card.`);
            }
        }
    }, false); // Bubbling phase
});

document.body.addEventListener('click', async () => {
    if (!audioContextStarted && typeof Tone !== 'undefined' && Tone.context.state !== 'running') {
        try {
            await Tone.start();
            audioContextStarted = true;
            logEvent("AudioContext started by user interaction.");
            if (!toneSynth) {
                toneSynth = new Tone.Synth({
                    oscillator: { type: "triangle" },
                    envelope: { attack: 0.005, decay: 0.1, sustain: 0.2, release: 0.3 }
                }).toDestination();
                logEvent("Tone.Synth initialized.");
            }
        } catch (e) {
            console.error("Error starting Tone.js AudioContext or initializing synth:", e);
        }
    }
}, { once: true });

// --- Card Draw and Action Logic ---
async function setCurrentCardDraw(card, type, playerId) {
    const gameDocRef = doc(db, "games", currentGameId);
    await updateDoc(gameDocRef, {
        currentCardDraw: {
            id: `${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
            type,
            text: card.text,
            action: card.action,
            amount: card.amount || null,
            amountPerTenancy: card.amountPerTenancy || null,
            amountPerPR: card.amountPerPR || null,
            playerId,
        },
        updatedAt: serverTimestamp(),
    });
}

function showCardModal(card, type, onOkCallback) {
    if (!onBoardCardDisplayDiv || !onBoardCardTypeH4 || !onBoardCardTextP || !onBoardCardOkButton) return;
    onBoardCardTypeH4.textContent = `${type} Card`;
    onBoardCardTextP.textContent = card.text;
    onBoardCardDisplayDiv.style.display = 'flex';

    const playerWhoDrew = localGameData.players[card.playerId];
    const amIEligibleToClickOk = card.playerId === currentUserId || (playerWhoDrew?.isAI && currentUserId === localGameData.hostId);

    onBoardCardOkButton.disabled = !amIEligibleToClickOk;
    onBoardCardOkButton.onclick = () => {
        if (!amIEligibleToClickOk) return;
        onBoardCardDisplayDiv.style.display = 'none';
        if (onOkCallback) onOkCallback();
    };
}


async function drawAndShowOpportunityCard(playerId) {
    const gameData = localGameData;
    if (!gameData || !gameData.shuffledOpportunityCards) {
        logEvent("drawAndShowOpportunityCard: Missing gameData or shuffledOpportunityCards.");
        return;
    }
    let cardIndex = gameData.opportunityCardIndex || 0;
    let deck = [...gameData.shuffledOpportunityCards];

    if (cardIndex >= deck.length) {
        logEvent("Reshuffling Opportunity Deck");
        deck = shuffleDeck([...opportunityCards]);
        cardIndex = 0;
        await updateDoc(doc(db, "games", currentGameId), {
            shuffledOpportunityCards: deck,
            opportunityCardIndex: 0
        });
    }
    const card = deck[cardIndex];
    await setCurrentCardDraw(card, 'Opportunity', playerId);
    await updateDoc(doc(db, "games", currentGameId), {
        opportunityCardIndex: cardIndex + 1,
    });
}

async function drawAndShowWelfareCard(playerId) {
    const gameData = localGameData;
    if (!gameData || !gameData.shuffledWelfareCards) {
        logEvent("drawAndShowWelfareCard: Missing gameData or shuffledWelfareCards.");
        return;
    }
    let cardIndex = gameData.welfareCardIndex || 0;
    let deck = [...gameData.shuffledWelfareCards];

    if (cardIndex >= deck.length) {
        logEvent("Reshuffling Welfare Deck");
        deck = shuffleDeck([...welfareCards]);
        cardIndex = 0;
        await updateDoc(doc(db, "games", currentGameId), {
            shuffledWelfareCards: deck,
            welfareCardIndex: 0
        });
    }
    const card = deck[cardIndex];
    await setCurrentCardDraw(card, 'Welfare', playerId);
    await updateDoc(doc(db, "games", currentGameId), {
        welfareCardIndex: cardIndex + 1,
    });
}


async function applyCardAction(card, playerId, deckType) {
    logEvent(`Applying card action: ${card.action} for player ${playerId}`, card);
    const gameDocRef = doc(db, "games", currentGameId);

    try {
        await runTransaction(db, async (transaction) => {
            const freshGameDoc = await transaction.get(gameDocRef);
            if (!freshGameDoc.exists()) throw new Error("Game not found for card action.");
            const freshGameData = freshGameDoc.data();
            const playerState = freshGameData.players[playerId];
            if (!playerState || playerState.isBankrupt) {
                logEvent(`Card action for ${playerId} skipped: Player not found or bankrupt.`);
                transaction.update(gameDocRef, { currentCardDraw: null, updatedAt: serverTimestamp(), lastActionMessage: `${playerState?.name || 'A player'} drew: ${card.text} (No action due to bankruptcy/state)` });
                return;
            }

            let updates = { updatedAt: serverTimestamp() };
            let messages = [`${playerState.name} ${playerState.isAI ? "(AI)" : ""} drew (${deckType}): "${card.text}"`];

            switch(card.action) {
                case 'collect':
                    updates[`players.${playerId}.money`] = (playerState.money || 0) + (card.amount || 0);
                    messages.push(`Collected £${card.amount}.`);
                    break;
                case 'pay':
                    const costToPay = card.amount || 0;
                    if (playerState.money >= costToPay) {
                        updates[`players.${playerId}.money`] = playerState.money - costToPay;
                        updates.bankMoney = (freshGameData.bankMoney || 0) + costToPay;
                        messages.push(`Paid £${costToPay} to the bank.`);
                    } else {
                        updates.bankMoney = (freshGameData.bankMoney || 0) + playerState.money;
                        updates[`players.${playerId}.money`] = 0;
                        updates[`players.${playerId}.isBankrupt`] = true;
                        messages.push(`Could not afford £${costToPay}, paid £${playerState.money} and is BANKRUPT!`);
                    }
                    break;
                case 'getOutOfDetentionFree':
                    updates[`players.${playerId}.getOutOfDetentionCards`] = (playerState.getOutOfDetentionCards || 0) + 1;
                    messages.push(`Received a Legal Aid card.`);
                    break;
                case 'gainHealthService':
                    updates[`players.${playerId}.healthServices`] = (playerState.healthServices || 0) + 1;
                    messages.push(`Gained a Health Service.`);
                    break;
                case 'payPerDevelopment':
                    let totalDevelopmentCost = 0;
                    playerState.propertiesOwned.forEach(propId => {
                        const propData = freshGameData.propertyData.find(p => p.id === propId);
                        if (propData) {
                            totalDevelopmentCost += (propData.tenancies || 0) * (card.amountPerTenancy || 0);
                            if (propData.permanentResidence) {
                                totalDevelopmentCost += (card.amountPerPR || 0);
                            }
                        }
                    });
                    if (totalDevelopmentCost > 0) {
                        if (playerState.money >= totalDevelopmentCost) {
                            updates[`players.${playerId}.money`] = playerState.money - totalDevelopmentCost;
                            updates.bankMoney = (freshGameData.bankMoney || 0) + totalDevelopmentCost;
                            messages.push(`Paid £${totalDevelopmentCost} for housing inspection.`);
                        } else {
                            updates.bankMoney = (freshGameData.bankMoney || 0) + playerState.money;
                            updates[`players.${playerId}.money`] = 0;
                            updates[`players.${playerId}.isBankrupt`] = true;
                            messages.push(`Could not afford housing inspection of £${totalDevelopmentCost}, paid £${playerState.money} and is BANKRUPT!`);
                        }
                    } else {
                        messages.push(`No developed properties, no inspection fee.`);
                    }
                    break;
                case 'moveToNearestPayout':
                    let currentPos = playerState.position;
                    let nearestPayoutId = -1;
                    let minDistance = freshGameData.boardLayout.length;
                    let passedGoOnCardMove = false;

                    freshGameData.boardLayout.forEach(space => {
                        if (space.type === 'payout') {
                            let dist = (space.id - currentPos + freshGameData.boardLayout.length) % freshGameData.boardLayout.length;
                            if (dist === 0 && space.id !== currentPos) dist = freshGameData.boardLayout.length;
                            else if (dist === 0 && space.id === currentPos) dist = freshGameData.boardLayout.length;

                            if (dist < minDistance) {
                                minDistance = dist;
                                nearestPayoutId = space.id;
                                if (currentPos + dist >= freshGameData.boardLayout.length && nearestPayoutId !== 0) {
                                    passedGoOnCardMove = true;
                                } else if (nearestPayoutId === 0 && currentPos !==0) {
                                    passedGoOnCardMove = true;
                                } else {
                                    passedGoOnCardMove = false; 
                                }
                            }
                        }
                    });
                    if (nearestPayoutId !== -1) {
                        updates[`players.${playerId}.position`] = nearestPayoutId;
                        messages.push(`Moved to ${freshGameData.boardLayout[nearestPayoutId].name}.`);

                        let currentMoneyForCard = updates[`players.${playerId}.money`] !== undefined ? updates[`players.${playerId}.money`] : playerState.money;

                        if (passedGoOnCardMove) {
                            const goPayout = 400;
                            currentMoneyForCard += goPayout;
                            updates.ukGovMoney = (updates.ukGovMoney !== undefined ? updates.ukGovMoney : freshGameData.ukGovMoney) - goPayout;
                            updates[`players.${playerId}.govReceived`] = (updates[`players.${playerId}.govReceived`] || playerState.govReceived || 0) + goPayout;
                            messages.push(`Passed Dole and collected £${goPayout}.`);
                        }

                        const payoutSpace = freshGameData.boardLayout[nearestPayoutId];
                        if (payoutSpace.amount) {
                            currentMoneyForCard += payoutSpace.amount;
                            updates.ukGovMoney = (updates.ukGovMoney !== undefined ? updates.ukGovMoney : freshGameData.ukGovMoney) - payoutSpace.amount;
                            updates[`players.${playerId}.govReceived`] = (updates[`players.${playerId}.govReceived`] || playerState.govReceived || 0) + payoutSpace.amount;
                            messages.push(`Collected £${payoutSpace.amount}.`);
                        }
                        updates[`players.${playerId}.money`] = currentMoneyForCard;
                    }
                    break;
                case 'goToDetentionDirect':
                    updates[`players.${playerId}.position`] = detentionCenterSpaceId;
                    updates[`players.${playerId}.inDetention`] = true;
                    updates[`players.${playerId}.missedTurnsInDetention`] = 0;
                    updates[`players.${playerId}.doublesRolledInTurn`] = 0;
                    updates[`players.${playerId}.playerActionTakenThisTurn`] = true;
                    messages.push(`Sent directly to Detention Center.`);
                    break;
                case 'housingVoucher':
                    updates[`players.${playerId}.hasHousingVoucher`] = true;
                    messages.push(`Received a Housing Voucher (25% off next estate).`);
                    break;
                case 'collectFromPlayers':
                    const amountPerPlayer = card.amount || 0;
                    let totalCollectedFromOthers = 0;
                    freshGameData.playerOrder.forEach(otherPlayerId => {
                        if (otherPlayerId !== playerId) {
                            const otherPlayerState = freshGameData.players[otherPlayerId];
                            if (otherPlayerState && !otherPlayerState.isBankrupt) {
                                if (otherPlayerState.money >= amountPerPlayer) {
                                    updates[`players.${otherPlayerId}.money`] = otherPlayerState.money - amountPerPlayer;
                                    totalCollectedFromOthers += amountPerPlayer;
                                } else {
                                    totalCollectedFromOthers += otherPlayerState.money;
                                    updates[`players.${otherPlayerId}.money`] = 0;
                                    updates[`players.${otherPlayerId}.isBankrupt`] = true;
                                    messages.push(`${otherPlayerState.name} ${otherPlayerState.isAI ? "(AI)" : ""} couldn't pay £${amountPerPlayer} and is BANKRUPT!`);
                                }
                            }
                        }
                    });
                    updates[`players.${playerId}.money`] = (playerState.money || 0) + totalCollectedFromOthers;
                    messages.push(`Collected a total of £${totalCollectedFromOthers} from other players.`);
                    break;
                case 'advanceToGo':
                    updates[`players.${playerId}.position`] = 0;
                    messages.push(`Advanced to Dole.`);
                    const goSalary = 400; 
                    updates[`players.${playerId}.money`] = (updates[`players.${playerId}.money`] !== undefined ? updates[`players.${playerId}.money`] : playerState.money) + goSalary;
                    updates.ukGovMoney = (updates.ukGovMoney !== undefined ? updates.ukGovMoney : freshGameData.ukGovMoney) - goSalary;
                    updates[`players.${playerId}.govReceived`] = (updates[`players.${playerId}.govReceived`] || playerState.govReceived || 0) + goSalary;
                    messages.push(`Collected £${goSalary}.`);
                    break;
                default:
                    messages.push(`(Action '${card.action}' not fully implemented).`);
                    logEvent("Unknown or not-yet-implemented card action:", card.action);
            }

            updates.lastActionMessage = messages.join(" ");
            updates.currentCardDraw = null;
            transaction.update(gameDocRef, updates);
        });
        logEvent("Card action transaction completed.");
    } catch (error) {
        console.error("Error applying card action (transaction phase):", error);
        showMessageModal("Card Action Error", "Could not apply card effect: " + error.message);
        await updateDoc(gameDocRef, { currentCardDraw: null, updatedAt: serverTimestamp(), lastActionMessage: `Error processing card: ${card.text}` });
    }
}

function calculateSpecialSetRent(propertyLayout, ownerId, gameData) {
    if (!propertyLayout || propertyLayout.groupId !== 'special_set' || !gameData || !gameData.propertyData) {
        logEvent("calculateSpecialSetRent: Invalid inputs or not a special_set property.", {propertyLayout, ownerId});
        return 0;
    }

    const ownedSpecialPropertiesCount = gameData.propertyData.filter(pData => {
        const pLayout = gameData.boardLayout.find(s => s.id === pData.id);
        return pLayout && pLayout.groupId === 'special_set' && pData.owner === ownerId;
    }).length;

    if (ownedSpecialPropertiesCount > 0) {
        const rent = 150 * ownedSpecialPropertiesCount;
        logEvent(`calculateSpecialSetRent: Owner ${ownerId} owns ${ownedSpecialPropertiesCount} special_set properties. Rent: £${rent}`);
        return rent;
    }
    logEvent(`calculateSpecialSetRent: Owner ${ownerId} owns 0 special_set properties. Rent: £0`);
    return 0;
}

async function payRent(payerState, propertyDataEntry, propertyLayoutDetails, gameData) {
    if (payerState.isBankrupt) {
        logEvent(`Rent skipped: Payer ${payerState.name} is already bankrupt.`);
        return;
    }

    const ownerId = propertyDataEntry.owner;
    if (!ownerId || ownerId === payerState.id) {
        return;
    }

    const ownerState = gameData.players[ownerId];
    if (!ownerState || ownerState.isBankrupt) {
        logEvent(`Rent skipped: Owner ${ownerState?.name || `ID ${ownerId}`} is bankrupt or not found for ${propertyLayoutDetails.name}.`);
        return;
    }

    let rentAmount = 0;

    if (propertyLayoutDetails.type === "set_property") {
        rentAmount = calculateSpecialSetRent(propertyLayoutDetails, ownerId, gameData);
        logEvent(`${payerState.name} ${payerState.isAI ? "(AI)" : ""} owes £${rentAmount} rent to ${ownerState.name} ${ownerState.isAI ? "(AI)" : ""} for ${propertyLayoutDetails.name} (Special Set).`);
    } else if (propertyLayoutDetails.type === "property") {
        const groupPropertiesLayout = gameData.boardLayout.filter(s => s.groupId === propertyLayoutDetails.groupId && s.type === 'property');
        const ownerOwnsAllInGroup = groupPropertiesLayout.every(gpLayout => {
            const gpDataForCheck = gameData.propertyData.find(pd => pd.id === gpLayout.id);
            return gpDataForCheck && gpDataForCheck.owner === ownerId;
        });

        if (propertyDataEntry.permanentResidence) {
            rentAmount = propertyLayoutDetails.rent[MAX_TENANCIES_BEFORE_PR + 1] || propertyLayoutDetails.rent[propertyLayoutDetails.rent.length -1];
        } else if (propertyDataEntry.tenancies > 0) {
            rentAmount = propertyLayoutDetails.rent[propertyDataEntry.tenancies] || 0;
        } else {
            rentAmount = propertyLayoutDetails.rent[0] || 0;
            if (ownerOwnsAllInGroup) {
                rentAmount *= 2;
                logEvent(`Rent for ${propertyLayoutDetails.name} is doubled to £${rentAmount} (unimproved, owns all in group).`);
            }
        }
        logEvent(`${payerState.name} ${payerState.isAI ? "(AI)" : ""} owes £${rentAmount} rent to ${ownerState.name} ${ownerState.isAI ? "(AI)" : ""} for ${propertyLayoutDetails.name} (Tenancies: ${propertyDataEntry.tenancies}, PR: ${propertyDataEntry.permanentResidence}).`);
    } else {
        logEvent(`Cannot calculate rent for ${propertyLayoutDetails.name} - unknown type or configuration.`);
        return;
    }

    if (rentAmount > 0) {
        const paymentDetails = await makePaymentTransaction(payerState.id, ownerId, rentAmount, `rent for ${propertyLayoutDetails.name}`);
        logEvent(`Rent payment outcome for ${payerState.name}: ${paymentDetails.message}`);

        if (paymentDetails.success && !paymentDetails.payerBankrupt) {
            const gameDocRef = doc(db, "games", currentGameId);
            await updateDoc(gameDocRef, {
                lastRentEvent: {
                    id: `${Date.now()}_rent_${Math.random().toString(36).substr(2,5)}`,
                    payerName: `${payerState.name}${payerState.isAI ? " (AI)" : ""}`,
                    recipientName: `${ownerState.name}${ownerState.isAI ? " (AI)" : ""}`,
                    amount: rentAmount,
                    propertyName: propertyLayoutDetails.name,
                    timestamp: serverTimestamp()
                },
                updatedAt: serverTimestamp()
            });
        }
    } else {
        logEvent(`Calculated rent is £0 for ${propertyLayoutDetails.name}. No payment made.`);
    }
}

async function handleAITurn(gameData, aiPlayerId) {
    logEvent(`AI Turn: ${aiPlayerId} (${gameData.players[aiPlayerId]?.name || 'Unknown'}) - Host (${currentUserId}) is processing.`);
    const aiPlayerState = gameData.players[aiPlayerId];
    const gameDocRef = doc(db, "games", currentGameId);

    if (!aiPlayerState || aiPlayerState.isBankrupt) {
        logEvent(`AI ${aiPlayerId} is bankrupt or invalid. Ending turn.`);
        try {
            await handleEndTurnAction(); 
        } catch (error) {
            logEvent(`Error ending turn for bankrupt/invalid AI ${aiPlayerId}: ${error.message}`, error);
        } finally {
             window._aiTurnInProgress = false;
        }
        return;
    }

    if (!gameData.status || gameData.status !== "active" || gameData.preGamePhase) {
        logEvent(`AI ${aiPlayerId} turn skipped: Game not active or in pre-game phase. Status: ${gameData.status}, PreGame: ${gameData.preGamePhase}`);
        window._aiTurnInProgress = false;
        return;
    }

    // Handle detention
    if (aiPlayerState.inDetention && !aiPlayerState.playerActionTakenThisTurn) {
        logEvent(`AI ${aiPlayerId} is in detention.`);
        const fineAmount = 50;
        let detentionActionMessage = "";
        let updates = { updatedAt: serverTimestamp() };

        try {
            if (aiPlayerState.money >= fineAmount && Math.random() > 0.3) { 
                updates[`players.${aiPlayerId}.money`] = aiPlayerState.money - fineAmount;
                updates[`players.${aiPlayerId}.inDetention`] = false;
                updates[`players.${aiPlayerId}.missedTurnsInDetention`] = 0;
                updates[`players.${aiPlayerId}.playerActionTakenThisTurn`] = false; 
                updates.bankMoney = (gameData.bankMoney || 0) + fineAmount;
                detentionActionMessage = `${aiPlayerState.name} (AI) paid £${fineAmount} fine and is free.`;
                logEvent(`AI ${aiPlayerId} paid fine to exit detention.`);
                await updateDoc(gameDocRef, { ...updates, lastActionMessage: detentionActionMessage });
                await new Promise(resolve => setTimeout(resolve, 700)); 
                window._aiTurnInProgress = false; 
                return; 
            } else {
                const die1 = Math.floor(Math.random() * 6) + 1;
                const die2 = Math.floor(Math.random() * 6) + 1;
                const isDoubles = die1 === die2;
                const totalRoll = die1 + die2;
                updates.lastDiceRoll = { die1, die2, total: totalRoll, isDoubles };
                let missedTurns = aiPlayerState.missedTurnsInDetention || 0;

                if (isDoubles) {
                    updates[`players.${aiPlayerId}.inDetention`] = false;
                    updates[`players.${aiPlayerId}.missedTurnsInDetention`] = 0;
                    updates[`players.${aiPlayerId}.playerActionTakenThisTurn`] = false; 
                    detentionActionMessage = `${aiPlayerState.name} (AI) rolled doubles (${die1},${die2}) and is out of Detention!`;
                } else {
                    missedTurns++;
                    updates[`players.${aiPlayerId}.missedTurnsInDetention`] = missedTurns;
                    updates[`players.${aiPlayerId}.playerActionTakenThisTurn`] = true; 
                    if (missedTurns >= 3) {
                        updates[`players.${aiPlayerId}.inDetention`] = false;
                        updates[`players.${aiPlayerId}.missedTurnsInDetention`] = 0;
                        if (aiPlayerState.money >= fineAmount) {
                            updates[`players.${aiPlayerId}.money`] = (aiPlayerState.money || 0) - fineAmount;
                            updates.bankMoney = (gameData.bankMoney || 0) + fineAmount;
                            detentionActionMessage = `${aiPlayerState.name} (AI) failed 3 rolls, paid £${fineAmount} and is out.`;
                            updates[`players.${aiPlayerId}.playerActionTakenThisTurn`] = false; 
                        } else {
                             updates[`players.${aiPlayerId}.money`] = 0;
                             updates[`players.${aiPlayerId}.isBankrupt`] = true;
                             updates.bankMoney = (gameData.bankMoney || 0) + aiPlayerState.money;
                             detentionActionMessage = `${aiPlayerState.name} (AI) failed 3 rolls, couldn't pay £${fineAmount}, and is BANKRUPT!`;
                        }
                    } else {
                        detentionActionMessage = `${aiPlayerState.name} (AI) failed to roll doubles (${die1},${die2}). Still in detention. ${3 - missedTurns} attempt(s) left.`;
                    }
                }
                await updateDoc(gameDocRef, { ...updates, lastActionMessage: detentionActionMessage });
                logEvent(`AI ${aiPlayerId} detention action: ${detentionActionMessage}`);
                await new Promise(resolve => setTimeout(resolve, 700));

                const freshSnapshot = await getDoc(gameDocRef); 
                const freshAIData = freshSnapshot.data().players[aiPlayerId];
                if (freshAIData.inDetention || freshAIData.isBankrupt || freshAIData.playerActionTakenThisTurn) {
                    try {
                        await handleEndTurnAction();
                    } catch (endError) {
                        logEvent(`Error ending turn after detention for AI ${aiPlayerId}: ${endError.message}`, endError);
                    }
                }
                 window._aiTurnInProgress = false;
                return;
            }
        } catch (error) {
            logEvent(`AI ${aiPlayerId} detention action failed: ${error.message}`, error);
            try { await handleEndTurnAction(); } catch (e) {}
            window._aiTurnInProgress = false;
            return;
        }
    }

    if (!aiPlayerState.playerActionTakenThisTurn && !aiPlayerState.inDetention) {
        logEvent(`AI ${aiPlayerId} rolling dice.`);
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        const totalRoll = die1 + die2;
        const isDoubles = die1 === die2;

        try {
            if (audioContextStarted && toneSynth) {
                toneSynth.triggerAttackRelease("C4", "16n", Tone.now());
                setTimeout(() => { if (toneSynth) toneSynth.triggerAttackRelease("E4", "16n", Tone.now() + 0.1); }, 100);
            }

            const playerStartPos = aiPlayerState.position;
            await animatePlayerMove(aiPlayerId, playerStartPos, totalRoll, gameData.boardLayout);

            let landedSpaceId;
            let rentPaymentRequired = false;
            let rentPayerId, rentPropertyId;

            try {
                await runTransaction(db, async (transaction) => {
                    const freshGameDoc = await transaction.get(gameDocRef);
                    if (!freshGameDoc.exists()) throw new Error("Game not found during AI roll.");
                    const freshGameData = freshGameDoc.data();
                    const playerState = freshGameData.players[aiPlayerId];
                    if (!playerState || playerState.isBankrupt) throw new Error("AI player missing or bankrupt.");
                    if (freshGameData.playerOrder[freshGameData.currentPlayerIndex] !== aiPlayerId) {
                        throw new Error("Not AI's turn.");
                    }
                    if (playerState.inDetention) { 
                        throw new Error("AI somehow still in detention for roll.");
                    }

                    let newPosition = playerState.position;
                    let messages = [];
                    let updates = {};

                    let currentDoublesCount = playerState.doublesRolledInTurn || 0;
                    if (isDoubles) {
                        currentDoublesCount++;
                        logEvent(`AI ${aiPlayerId} rolled doubles (${die1},${die2}), count: ${currentDoublesCount}.`);
                    } else {
                        currentDoublesCount = 0;
                    }
                    updates[`players.${aiPlayerId}.doublesRolledInTurn`] = currentDoublesCount;

                    if (isDoubles && currentDoublesCount === 3) {
                        messages.push(`${playerState.name} (AI) rolled 3 doubles! Sent to Detention.`);
                        newPosition = detentionCenterSpaceId;
                        updates[`players.${aiPlayerId}.position`] = newPosition;
                        updates[`players.${aiPlayerId}.inDetention`] = true;
                        updates[`players.${aiPlayerId}.missedTurnsInDetention`] = 0;
                        updates[`players.${aiPlayerId}.playerActionTakenThisTurn`] = true; 
                        updates[`players.${aiPlayerId}.doublesRolledInTurn`] = 0;
                        landedSpaceId = newPosition;
                    } else {
                        newPosition = (playerState.position + totalRoll) % freshGameData.boardLayout.length;
                        updates[`players.${aiPlayerId}.position`] = newPosition;
                        landedSpaceId = newPosition;
                        const landedSpace = freshGameData.boardLayout[newPosition];
                        messages.push(`${playerState.name} (AI) rolled ${totalRoll} (${die1}, ${die2})${isDoubles ? " (Doubles!)" : ""}. Moved to ${landedSpace.name}.`);

                        let passedGo = false;
                        if (playerState.position + totalRoll >= freshGameData.boardLayout.length && !(isDoubles && currentDoublesCount === 3)) {
                            passedGo = true;
                        }
                        if (passedGo) {
                            const goPayout = 400;
                            updates[`players.${aiPlayerId}.money`] = (playerState.money || 0) + goPayout;
                            updates.ukGovMoney = (freshGameData.ukGovMoney || 0) - goPayout;
                            updates[`players.${aiPlayerId}.govReceived`] = (playerState.govReceived || 0) + goPayout;
                            messages.push(`${playerState.name} (AI) passed Dole and collected £${goPayout}.`);
                        }

                        if (landedSpace.type === 'payout' && landedSpace.amount) {
                            const currentMoney = updates[`players.${aiPlayerId}.money`] !== undefined ? updates[`players.${aiPlayerId}.money`] : playerState.money;
                            updates[`players.${aiPlayerId}.money`] = currentMoney + landedSpace.amount;
                            updates.ukGovMoney = (updates.ukGovMoney !== undefined ? updates.ukGovMoney : freshGameData.ukGovMoney) - landedSpace.amount;
                            updates[`players.${aiPlayerId}.govReceived`] = (updates[`players.${aiPlayerId}.govReceived`] || playerState.govReceived || 0) + landedSpace.amount;
                            messages.push(`${playerState.name} (AI) collected £${landedSpace.amount} from ${landedSpace.name}.`);
                        } else if (landedSpace.type === 'tax' && landedSpace.amount) {
                            const currentMoney = updates[`players.${aiPlayerId}.money`] !== undefined ? updates[`players.${aiPlayerId}.money`] : playerState.money;
                            if (currentMoney >= landedSpace.amount) {
                                updates[`players.${aiPlayerId}.money`] = currentMoney - landedSpace.amount;
                                updates.bankMoney = (freshGameData.bankMoney || 0) + landedSpace.amount;
                                messages.push(`${playerState.name} (AI) paid £${landedSpace.amount} for ${landedSpace.name}.`);
                            } else {
                                updates[`players.${aiPlayerId}.money`] = 0;
                                updates[`players.${aiPlayerId}.isBankrupt`] = true;
                                updates.bankMoney = (freshGameData.bankMoney || 0) + currentMoney;
                                messages.push(`${playerState.name} (AI) couldn't pay £${landedSpace.amount} tax for ${landedSpace.name} and is BANKRUPT!`);
                            }
                        } else if (landedSpace.type === 'crime_spree' && landedSpace.amount) {
                            const currentMoney = updates[`players.${aiPlayerId}.money`]  !== undefined ? updates[`players.${aiPlayerId}.money`] : playerState.money;
                            if (currentMoney >= landedSpace.amount) {
                                updates[`players.${aiPlayerId}.money`] = currentMoney - landedSpace.amount;
                                updates.bankMoney = (freshGameData.bankMoney || 0) + landedSpace.amount;
                                messages.push(`${playerState.name} (AI) fined £${landedSpace.amount} for Crime Spree!`);
                            } else {
                                updates[`players.${aiPlayerId}.money`] = 0;
                                updates[`players.${aiPlayerId}.isBankrupt`] = true;
                                updates.bankMoney = (freshGameData.bankMoney || 0) + currentMoney;
                                messages.push(`${playerState.name} (AI) couldn't pay £${landedSpace.amount} fine for Crime Spree and is BANKRUPT!`);
                            }
                        } else if (landedSpace.type === 'go_to_detention') {
                            updates[`players.${aiPlayerId}.position`] = detentionCenterSpaceId;
                            updates[`players.${aiPlayerId}.inDetention`] = true;
                            updates[`players.${aiPlayerId}.missedTurnsInDetention`] = 0;
                            messages.push(`${playerState.name} (AI) was sent to Detention!`);
                            isDoubles = false; 
                            currentDoublesCount = 0;
                            updates[`players.${aiPlayerId}.doublesRolledInTurn`] = 0;
                        }

                        const propertyDataEntry = freshGameData.propertyData.find(p => p.id === landedSpace.id);
                        if ((landedSpace.type === 'property' || landedSpace.type === 'set_property') &&
                            propertyDataEntry && propertyDataEntry.owner && propertyDataEntry.owner !== aiPlayerId &&
                            !freshGameData.players[propertyDataEntry.owner]?.isBankrupt) {
                            rentPaymentRequired = true;
                            rentPayerId = aiPlayerId;
                            rentPropertyId = landedSpace.id;
                            messages.push(`${playerState.name} (AI) landed on ${landedSpace.name}, owned by ${freshGameData.players[propertyDataEntry.owner]?.name}. Rent due.`);
                        }
                        updates[`players.${aiPlayerId}.playerActionTakenThisTurn`] = !isDoubles || currentDoublesCount >= 3;
                        if (isDoubles && currentDoublesCount < 3) {
                            logEvent(`AI ${aiPlayerId} set to roll again due to doubles (count: ${currentDoublesCount}).`);
                        }
                    }

                    updates.lastDiceRoll = { die1, die2, total: totalRoll, isDoubles };
                    updates.lastActionMessage = messages.join(" ");
                    updates.updatedAt = serverTimestamp();
                    transaction.update(gameDocRef, updates);
                });

                if (rentPaymentRequired && rentPayerId && rentPropertyId !== undefined) {
                    logEvent(`AI ${aiPlayerId} rent payment for property ID ${rentPropertyId}.`);
                    try {
                        const gameSnapshot = await getDoc(gameDocRef);
                        if (gameSnapshot.exists()) {
                            const currentFreshGameData = gameSnapshot.data();
                            const payerState = currentFreshGameData.players[rentPayerId];
                            const propertyForRentLayout = currentFreshGameData.boardLayout.find(s => s.id === rentPropertyId);
                            const propertyForRentData = currentFreshGameData.propertyData.find(p => p.id === rentPropertyId);

                            if (payerState && propertyForRentLayout && propertyForRentData && propertyForRentData.owner && propertyForRentData.owner !== rentPayerId) {
                                await payRent(payerState, propertyForRentData, propertyForRentLayout, currentFreshGameData);
                            }
                        }
                    } catch (rentError) { logEvent(`AI ${aiPlayerId} rent payment failed: ${rentError.message}`, rentError); }
                }

                setTimeout(async () => {
                    try {
                        const cardGameSnapshot = await getDoc(gameDocRef); 
                        if (!cardGameSnapshot.exists()) { window._aiTurnInProgress = false; return; }
                        const cardGameData = cardGameSnapshot.data();
                        const currentAIPState = cardGameData.players[aiPlayerId];
                        
                        if (!currentAIPState || currentAIPState.isBankrupt || currentAIPState.inDetention || landedSpaceId === undefined) {
                             window._aiTurnInProgress = false; return;
                        }

                        const finalLandedSpace = cardGameData.boardLayout[landedSpaceId];
                        if (!finalLandedSpace) { window._aiTurnInProgress = false; return; }

                        if (!rentPaymentRequired) { 
                            if (finalLandedSpace.type === 'opportunity') {
                                await drawAndShowOpportunityCard(aiPlayerId);
                                logEvent(`AI ${aiPlayerId} drew an opportunity card.`);
                            } else if (finalLandedSpace.type === 'welfare') {
                                await drawAndShowWelfareCard(aiPlayerId);
                                logEvent(`AI ${aiPlayerId} drew a welfare card.`);
                            }
                        }
                    } catch (cardError) { logEvent(`AI ${aiPlayerId} card draw failed: ${cardError.message}`, cardError); }
                }, rentPaymentRequired ? 900 : 500); 
            } catch (rollError) {
                logEvent(`AI ${aiPlayerId} roll transaction failed: ${rollError.message}`, rollError);
            }
        } catch (moveError) {
            logEvent(`AI ${aiPlayerId} move/animation or subsequent action failed: ${moveError.message}`, moveError);
        }

        setTimeout(async () => {
            try {
                const freshGameSnapshot = await getDoc(gameDocRef);
                if (freshGameSnapshot.exists()) {
                    const freshGameData = freshGameSnapshot.data();
                    const playerState = freshGameData.players[aiPlayerId];
                    if (!playerState) {
                        logEvent(`AI ${aiPlayerId} turn end skipped: Player state missing.`);
                    } else if (freshGameData.playerOrder[freshGameData.currentPlayerIndex] === aiPlayerId &&
                        (playerState.playerActionTakenThisTurn || playerState.isBankrupt || playerState.inDetention) &&
                        currentUserId === freshGameData.hostId) {
                        logEvent(`Host ending turn for AI ${aiPlayerId}. ActionTaken: ${playerState.playerActionTakenThisTurn}, Bankrupt: ${playerState.isBankrupt}, InDetention: ${playerState.inDetention}, Doubles: ${playerState.doublesRolledInTurn}`);
                        await handleEndTurnAction();
                    } else if (playerState.doublesRolledInTurn > 0 && playerState.doublesRolledInTurn < 3 && !playerState.inDetention && !playerState.isBankrupt) {
                        logEvent(`AI ${aiPlayerId} turn not ended: Doubles rolled (count: ${playerState.doublesRolledInTurn}), AI will roll again.`);
                         window._aiTurnInProgress = false; 
                         return;
                    } else {
                        logEvent(`AI ${aiPlayerId} turn end skipped: Conditions not met or handled by doubles re-roll. PlayerActionTaken: ${playerState.playerActionTakenThisTurn}`);
                    }
                }
            } catch (endError) {
                logEvent(`Error ending turn for AI ${aiPlayerId}: ${endError.message}`, endError);
            } finally {
                window._aiTurnInProgress = false;
            }
        }, 1500); 
    } else {
         window._aiTurnInProgress = false;
    }
}

// --- Property Swap Logic (No Modals Version) ---
function handlePropertyCardClick(space, spaceDiv, gameData) {
    // This function can be used for displaying property info on single click, but not for swap.
    // logEvent(`Single-clicked property: ${space.name} (ID: ${space.id}) by ${currentUserId}`);
}

// --- Patch handlePropertyCardDoubleClick to use Firestore for swap state ---
async function handlePropertyCardDoubleClick(space, spaceDivElement, gameData) {
    if (!gameData || !gameData.players || !gameData.propertyData) {
        logEvent("Property swap (dblclick): gameData incomplete.");
        return;
    }
    const currentPlayerId = currentUserId;
    const currentPlayerState = gameData.players[currentPlayerId];
    const gameDocRef = doc(db, "games", currentGameId);
    const swapState = gameData.currentSwapProposal || {};
    // Only allow one active proposal at a time
    if (swapState.swapActive) return;
    if (!currentPlayerState || currentPlayerState.isBankrupt || gameData.status !== 'active' || gameData.preGamePhase) {
        logEvent("Property swap (dblclick): Not allowed due to player/game state.");
        return;
    }
    if (!space || (space.type !== 'property' && space.type !== 'set_property')) {
        logEvent("Property swap (dblclick): Clicked space is not a property.");
        return;
    }
    const clickedPropData = gameData.propertyData.find(p => p.id === space.id);
    if (!clickedPropData) {
        logEvent("Property swap (dblclick): Property data not found.");
        return;
    }
    // Step 1: Select own property
    if (clickedPropData.owner === currentPlayerId) {
        await updateDoc(gameDocRef, {
            currentSwapProposal: {
                cardA: { playerId: currentPlayerId, propId: space.id },
                cardB: null,
                swapInitiatorPlayerId: currentPlayerId,
                swapActive: false,
                swapTimeoutSetAt: Date.now(),
            },
            flashingProperties: [space.id],
            lastActionMessage: `${currentPlayerState.name} is considering a property swap...`,
            updatedAt: serverTimestamp(),
        });
        return;
    }
    // Step 2: Propose swap with another player's property
    if (swapState.cardA && swapState.swapInitiatorPlayerId === currentPlayerId && clickedPropData.owner !== null && clickedPropData.owner !== currentPlayerId) {
        const targetPlayerId = clickedPropData.owner;
        const targetPlayerState = gameData.players[targetPlayerId];
        if (!targetPlayerState || targetPlayerState.isBankrupt) {
            await clearSwapProposalInFirestore(gameDocRef);
            return;
        }
        await updateDoc(gameDocRef, {
            currentSwapProposal: {
                cardA: swapState.cardA,
                cardB: { playerId: targetPlayerId, propId: space.id },
                swapInitiatorPlayerId: currentPlayerId,
                swapActive: true,
                swapTimeoutSetAt: Date.now(),
            },
            flashingProperties: [swapState.cardA.propId, space.id],
            lastActionMessage: `${currentPlayerState.name} proposed to swap "${gameData.boardLayout.find(s => s.id === swapState.cardA.propId)?.name || "a property"}" with ${targetPlayerState.name}'s "${space.name || "a property"}". Click a flashing card to proceed.`,
            updatedAt: serverTimestamp(),
        });
        return;
    }
    // Deselect/cancel
    if (swapState.cardA && swapState.cardA.propId === space.id && !swapState.cardB) {
        await clearSwapProposalInFirestore(gameDocRef);
        return;
    }
    // Invalid
    logEvent("Swap Info (dblclick): Invalid swap double-click action.");
}

// --- Patch global click handler for swap acceptance/cancellation ---
document.addEventListener('click', async function(e) {
    const swapState = window._propertySwapState;
    if (!swapState || !swapState.swapActive || !swapState.cardA || !swapState.cardB) return;
    const clickedElement = e.target.closest('.space.property, .space.set-property');
    if (!clickedElement) return;
    const clickedPropId = parseInt(clickedElement.id.replace('space-', ''));
    const gameDocRef = doc(db, "games", currentGameId);
    const gameDataForClick = localGameData;
    const { cardA, cardB, swapInitiatorPlayerId } = swapState;
    if (!cardA || !cardB) {
        logEvent("Swap Click: CardA or CardB is null, aborting interaction logic.");
        window._propertySwapState = { cardA: null, cardB: null, swapInitiatorPlayerId: null, swapActive: false, swapTimeout: null };
        await updateDoc(gameDocRef, { flashingProperties: [], lastActionMessage: "Swap cancelled due to incomplete state.", updatedAt: serverTimestamp() });
        return;
    }
    const initiatorPlayerId = cardA.playerId;
    const targetPlayerId = cardB.playerId;
    let actionTaken = false;
    if (clickedPropId === cardA.propId) {
        if (currentUserId === initiatorPlayerId) {
            logEvent(`Swap CANCELLED by initiator ${initiatorPlayerId} (P1) re-clicking their own card (${cardA.propId}).`);
            await updateDoc(gameDocRef, {
                flashingProperties: [],
                lastActionMessage: `${gameDataForClick.players[initiatorPlayerId]?.name || 'Initiator'} cancelled the swap.`,
                updatedAt: serverTimestamp()
            });
            actionTaken = true;
        } else if (currentUserId === targetPlayerId) {
            logEvent(`Swap CONFIRMED by target ${targetPlayerId} (P2) clicking initiator's card (${cardA.propId}). Performing swap.`);
            await performPropertySwap(cardA, cardB, gameDataForClick);
            actionTaken = true;
        }
    } else if (clickedPropId === cardB.propId) {
        if (currentUserId === initiatorPlayerId) {
            logEvent(`Swap CONFIRMED by initiator ${initiatorPlayerId} (P1) re-clicking target's card (${cardB.propId}). Performing swap.`);
            await performPropertySwap(cardA, cardB, gameDataForClick);
            actionTaken = true;
        } else if (currentUserId === targetPlayerId) {
            logEvent(`Swap CANCELLED by target ${targetPlayerId} (P2) clicking their own card (${cardB.propId}).`);
            await updateDoc(gameDocRef, {
                flashingProperties: [],
                lastActionMessage: `${gameDataForClick.players[targetPlayerId]?.name || 'Target player'} declined the swap.`,
                updatedAt: serverTimestamp()
            });
            actionTaken = true;
        }
    }
    if (actionTaken) {
        if (window._propertySwapState.swapTimeout) {
            clearTimeout(window._propertySwapState.swapTimeout);
        }
        window._propertySwapState = { cardA: null, cardB: null, swapInitiatorPlayerId: null, swapActive: false, swapTimeout: null };
    } else {
        logEvent(`Swap Click Ignored: Click by ${currentUserId} on ${clickedPropId} did not match confirm/cancel conditions for involved players.`);
    }
}, false);

async function performPropertySwap(instigatorCardInfo, targetCardInfo, gameDataSnapshot) {
    if (!instigatorCardInfo || !targetCardInfo) {
        logEvent("performPropertySwap: Missing instigator or target data.");
        return;
    }
    if (!currentGameId || !db) {
        logEvent("performPropertySwap: Missing gameId or db connection.");
        return;
    }
    const gameDocRef = doc(db, 'games', currentGameId);
    try {
        await runTransaction(db, async (transaction) => {
            const freshGameDoc = await transaction.get(gameDocRef);
            if (!freshGameDoc.exists()) throw new Error('Game not found for property swap.');
            const freshGameData = freshGameDoc.data();
            const instigatorPlayerId = instigatorCardInfo.playerId;
            const targetPlayerId = targetCardInfo.playerId;
            const instigatorPropId = instigatorCardInfo.propId;
            const targetPropId = targetCardInfo.propId;
            const propA_Layout = freshGameData.boardLayout.find(s => s.id === instigatorPropId);
            const propB_Layout = freshGameData.boardLayout.find(s => s.id === targetPropId);
            const propA_DataIndex = freshGameData.propertyData.findIndex(p => p.id === instigatorPropId);
            const propB_DataIndex = freshGameData.propertyData.findIndex(p => p.id === targetPropId);
            if (propA_DataIndex === -1 || propB_DataIndex === -1) {
                throw new Error('One or both properties not found. Swap cancelled.');
            }
            const propA_CurrentData = freshGameData.propertyData[propA_DataIndex];
            const propB_CurrentData = freshGameData.propertyData[propB_DataIndex];
            if (propA_CurrentData.owner !== instigatorPlayerId || propB_CurrentData.owner !== targetPlayerId) {
                throw new Error('Property ownership changed. Swap cancelled.');
            }
            const instigatorPlayer = freshGameData.players[instigatorPlayerId];
            const targetPlayer = freshGameData.players[targetPlayerId];
            if (!instigatorPlayer || instigatorPlayer.isBankrupt || !targetPlayer || targetPlayer.isBankrupt) {
                throw new Error('One or both players bankrupt/invalid. Swap cancelled.');
            }
            let updates = {};
            let updatedPropertyData = freshGameData.propertyData.map(p => ({ ...p }));
            updatedPropertyData[propA_DataIndex].owner = targetPlayerId;
            updatedPropertyData[propB_DataIndex].owner = instigatorPlayerId;
            updates.propertyData = updatedPropertyData;
            let instigatorProps = (instigatorPlayer.propertiesOwned || []).filter(id => id !== instigatorPropId);
            instigatorProps.push(targetPropId);
            updates[`players.${instigatorPlayerId}.propertiesOwned`] = instigatorProps;
            let targetProps = (targetPlayer.propertiesOwned || []).filter(id => id !== targetPropId);
            targetProps.push(instigatorPropId);
            updates[`players.${targetPlayerId}.propertiesOwned`] = targetProps;
            updates.lastActionMessage = `${instigatorPlayer.name} and ${targetPlayer.name} swapped ${propA_Layout?.name || 'property'} for ${propB_Layout?.name || 'property'}!`;
            updates.flashingProperties = [];
            updates.updatedAt = serverTimestamp();
            transaction.update(gameDocRef, updates);
            logEvent(`Property swap committed: ${instigatorPropId} (${instigatorPlayerId}) <-> ${targetPropId} (${targetPlayerId})`);
        });
    } catch (e) {
        console.error("Error during property swap transaction:", e);
        await updateDoc(gameDocRef, {
            flashingProperties: [],
            lastActionMessage: "Property swap failed: " + e.message,
            updatedAt: serverTimestamp()
        }).catch(err => console.error("Error clearing flashing props after failed swap tx:", err));
    } finally {
        window._propertySwapState = { cardA: null, cardB: null, swapInitiatorPlayerId: null, swapActive: false, swapTimeout: null };
    }
}