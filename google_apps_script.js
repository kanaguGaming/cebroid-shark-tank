/**
 * CEBROID 2K26 SHARK TANK - GOOGLE APPS SCRIPT BACKEND
 * 
 * INSTRUCTIONS:
 * 1. Open your Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this entire code into the Code.gs file.
 * 4. Your sheet must have 3 tabs named exactly: "Users", "Projects", "Investments".
 *    - Users columns: UserID, Password, Role, GoldCoins, SilverCoins
 *    - Projects columns: ProjectID, Name
 *    - Investments columns: Timestamp, InvestorID, ProjectID, CoinType, Amount
 * 5. Click "Deploy" > "New deployment".
 * 6. Select type: "Web app".
 * 7. Execute as: "Me", Who has access: "Anyone".
 * 8. Copy the Web App URL and use it in your app.js files.
 */

function doPost(e) {
  return handleRequest(e);
}

function doGet(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  
  if (e.postData && e.postData.contents) {
    try {
      const data = JSON.parse(e.postData.contents);
      let response = { success: false, message: "Unknown action" };
      
      if (data.action === "login") {
        response = login(data.userId, data.password);
      } else if (data.action === "invest") {
        response = invest(data.investorId, data.projectId, data.amount, data.coinType);
      } else if (data.action === "getScores") {
        response = getScores(data.projectId);
      } else if (data.action === "getAllScores") {
        response = getAllScores();
      }
      
      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders(headers);
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders(headers);
    }
  }
  
  // Handle GET requests
  if (e.parameter.action === "getScores") {
    let response = getScores(e.parameter.projectId);
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(headers);
  }

  return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Invalid Request" }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(headers);
}

function login(userId, password) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == userId && data[i][1] == password) {
      return {
        success: true,
        user: {
          userId: data[i][0],
          role: data[i][2], // "Jury", "Viewer", "Contestant", "Admin"
          goldCoins: data[i][3],
          silverCoins: data[i][4]
        }
      };
    }
  }
  return { success: false, message: "Invalid credentials" };
}

function invest(investorId, projectId, amount, coinType) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const usersSheet = ss.getSheetByName("Users");
  const usersData = usersSheet.getDataRange().getValues();
  
  let userRowIndex = -1;
  let currentBalance = 0;
  let coinColumn = coinType === "Gold" ? 3 : 4; 
  
  // 1. Check User Balance
  for (let i = 1; i < usersData.length; i++) {
    if (usersData[i][0] == investorId) {
      userRowIndex = i + 1;
      currentBalance = usersData[i][coinColumn];
      break;
    }
  }
  
  if (userRowIndex === -1) return { success: false, message: "Investor not found" };
  if (currentBalance < amount) return { success: false, message: "Insufficient balance" };
  if (amount <= 0) return { success: false, message: "Invalid amount" };
  
  // 2. Deduct Balance
  usersSheet.getRange(userRowIndex, coinColumn + 1).setValue(currentBalance - amount); 
  
  // 3. Record Transaction
  const investSheet = ss.getSheetByName("Investments");
  investSheet.appendRow([new Date(), investorId, projectId, coinType, amount]);
  
  return { success: true, message: "Investment successful!", newBalance: currentBalance - amount };
}

function getScores(projectId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Investments");
  if (!sheet) return { success: false, message: "Sheet not found" };
  
  const data = sheet.getDataRange().getValues();
  let totalGold = 0;
  let totalSilver = 0;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] == projectId) {
      if (data[i][3] === "Gold") totalGold += data[i][4];
      if (data[i][3] === "Silver") totalSilver += data[i][4];
    }
  }
  
  return { 
    success: true, 
    projectId: projectId, 
    scores: { gold: totalGold, silver: totalSilver } 
  };
}

function getAllScores() {
  const investSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Investments");
  if (!investSheet) return { success: false, message: "Sheet not found" };
  
  const data = investSheet.getDataRange().getValues();
  let scoresMap = {};
  
  for (let i = 1; i < data.length; i++) {
    let pId = data[i][2];
    let type = data[i][3];
    let amt = data[i][4];
    
    if (!scoresMap[pId]) {
      scoresMap[pId] = { gold: 0, silver: 0 };
    }
    
    if (type === "Gold") scoresMap[pId].gold += amt;
    if (type === "Silver") scoresMap[pId].silver += amt;
  }
  
  return { success: true, scores: scoresMap };
}
