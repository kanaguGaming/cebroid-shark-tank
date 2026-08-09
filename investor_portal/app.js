// REPLACE THIS WITH YOUR DEPLOYED GOOGLE APPS SCRIPT WEB APP URL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyXHQAsjk41Eojl6rvkcFMUCxIqsHWOgLsiY2dtVPC-HIot8pG31GjG1Uh8lyoLz6yI/exec";

document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    
    // Login Elements
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');
    
    // Dashboard Elements
    const displayUser = document.getElementById('display-user');
    const displayRole = document.getElementById('display-role');
    const displayBalance = document.getElementById('display-balance');
    const displayCoinType = document.getElementById('display-coin-type');
    const balanceCard = document.getElementById('balance-card');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Invest Elements
    const investForm = document.getElementById('invest-form');
    const investBtn = document.getElementById('invest-btn');
    const investMsg = document.getElementById('invest-msg');
    const projectIdInput = document.getElementById('projectId');
    
    // Check for existing session
    const currentUser = JSON.parse(localStorage.getItem('sharkTankUser'));
    if (currentUser && (currentUser.role === 'Jury' || currentUser.role === 'Viewer' || currentUser.role === 'Admin')) {
        showDashboard(currentUser);
    }
    
    // Check URL parameters for QR scan (e.g. index.html?project=PRJ01)
    const urlParams = new URLSearchParams(window.location.search);
    const scannedProject = urlParams.get('project');
    if (scannedProject) {
        projectIdInput.value = scannedProject;
    }

    // Handle Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userId = document.getElementById('userId').value;
        const password = document.getElementById('password').value;
        
        loginBtn.disabled = true;
        loginBtn.innerHTML = `<span>Loading...</span><i data-lucide="loader-2" class="animate-spin"></i>`;
        lucide.createIcons();
        loginError.textContent = '';

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'login', userId, password })
            });
            const data = await response.json();
            
            if (data.success) {
                // Save to local storage
                localStorage.setItem('sharkTankUser', JSON.stringify(data.user));
                showDashboard(data.user);
            } else {
                loginError.textContent = data.message;
            }
        } catch (error) {
            loginError.textContent = "Network error. Please try again.";
            console.error(error);
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = `<span>Enter the Tank</span><i data-lucide="arrow-right"></i>`;
            lucide.createIcons();
        }
    });
    
    // Handle Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('sharkTankUser');
        loginSection.classList.add('active');
        loginSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
        dashboardSection.classList.remove('active');
        document.getElementById('userId').value = '';
        document.getElementById('password').value = '';
    });
    
    // Handle Investment
    investForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const user = JSON.parse(localStorage.getItem('sharkTankUser'));
        if (!user) return;
        
        const projectId = projectIdInput.value;
        const amount = parseInt(document.getElementById('amount').value);
        const coinType = (user.role === 'Jury' || user.role === 'Admin') ? 'Gold' : 'Silver';
        
        investBtn.disabled = true;
        investBtn.innerHTML = `<span>Processing...</span>`;
        investMsg.className = 'status-msg';
        investMsg.textContent = '';
        
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ 
                    action: 'invest', 
                    investorId: user.userId, 
                    projectId: projectId,
                    amount: amount,
                    coinType: coinType
                })
            });
            const data = await response.json();
            
            if (data.success) {
                investMsg.textContent = data.message;
                investMsg.classList.add('success');
                
                // Update local user state
                if (coinType === 'Gold') {
                    user.goldCoins = data.newBalance;
                } else {
                    user.silverCoins = data.newBalance;
                }
                localStorage.setItem('sharkTankUser', JSON.stringify(user));
                
                // Update UI display
                displayBalance.textContent = data.newBalance;
                
                // Reset form
                document.getElementById('amount').value = '';
            } else {
                investMsg.textContent = data.message;
                investMsg.classList.add('error');
            }
        } catch (error) {
            investMsg.textContent = "Network error. Investment failed.";
            investMsg.classList.add('error');
            console.error(error);
        } finally {
            investBtn.disabled = false;
            investBtn.innerHTML = `<span>Invest Now</span><i data-lucide="trending-up"></i>`;
            lucide.createIcons();
        }
    });
    
    function showDashboard(user) {
        loginSection.classList.remove('active');
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        dashboardSection.classList.add('active');
        
        displayUser.textContent = user.userId;
        displayRole.textContent = user.role;
        
        balanceCard.className = 'balance-card'; // reset classes
        
        if (user.role === 'Jury' || user.role === 'Admin') {
            displayBalance.textContent = user.goldCoins;
            displayCoinType.textContent = "Gold Coins";
            balanceCard.classList.add('gold-theme');
        } else {
            displayBalance.textContent = user.silverCoins;
            displayCoinType.textContent = "Silver Coins";
            balanceCard.classList.add('silver-theme');
        }
    }
});
