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
    const displayProjectId = document.getElementById('display-project-id');
    const goldScoreEl = document.getElementById('gold-score');
    const silverScoreEl = document.getElementById('silver-score');
    const refreshBtn = document.getElementById('refresh-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const statusMsg = document.getElementById('status-msg');
    
    let chartInstance = null;
    let autoRefreshInterval = null;
    
    // Check for existing session
    const currentUser = JSON.parse(localStorage.getItem('sharkTankProject'));
    if (currentUser && currentUser.role === 'Contestant') {
        showDashboard(currentUser);
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
            
            // Allow only Contestants or Admins here
            if (data.success && (data.user.role === 'Contestant' || data.user.role === 'Admin')) {
                // If it's Admin logging in, they can view any project ID. 
                // For simplicity, we just use the user ID as the project ID to track.
                // In a real app, Admin might have a separate dashboard showing ALL projects.
                const projectData = {
                    ...data.user,
                    projectId: userId // Usually Contestant UserID = ProjectID
                };
                localStorage.setItem('sharkTankProject', JSON.stringify(projectData));
                showDashboard(projectData);
            } else if (data.success) {
                loginError.textContent = "Access denied. Only contestants can log in here.";
            } else {
                loginError.textContent = data.message;
            }
        } catch (error) {
            loginError.textContent = "Network error. Please try again.";
            console.error(error);
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = `<span>View Dashboard</span><i data-lucide="arrow-right"></i>`;
            lucide.createIcons();
        }
    });
    
    // Handle Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('sharkTankProject');
        loginSection.classList.add('active');
        loginSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
        dashboardSection.classList.remove('active');
        document.getElementById('userId').value = '';
        document.getElementById('password').value = '';
        
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
        }
    });
    
    refreshBtn.addEventListener('click', () => {
        const user = JSON.parse(localStorage.getItem('sharkTankProject'));
        if (user) {
            fetchScores(user.projectId, true);
        }
    });
    
    function showDashboard(user) {
        loginSection.classList.remove('active');
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        dashboardSection.classList.add('active');
        
        displayProjectId.textContent = user.projectId;
        
        initChart();
        fetchScores(user.projectId, false);
        
        // Auto refresh every 15 seconds
        if (autoRefreshInterval) clearInterval(autoRefreshInterval);
        autoRefreshInterval = setInterval(() => {
            fetchScores(user.projectId, false);
        }, 15000);
    }
    
    async function fetchScores(projectId, isManualRefresh = false) {
        if (isManualRefresh) {
            refreshBtn.classList.add('spin');
            statusMsg.textContent = "Refreshing...";
        }
        
        try {
            // Using GET request to bypass CORS preflight and speed up simple score fetching if we set up doGet in GAS
            const response = await fetch(`${SCRIPT_URL}?action=getScores&projectId=${projectId}`);
            const data = await response.json();
            
            if (data.success) {
                const gold = data.scores.gold || 0;
                const silver = data.scores.silver || 0;
                
                animateValue(goldScoreEl, parseInt(goldScoreEl.textContent), gold, 1000);
                animateValue(silverScoreEl, parseInt(silverScoreEl.textContent), silver, 1000);
                
                updateChart(gold, silver);
                
                if (isManualRefresh) {
                    const now = new Date();
                    statusMsg.textContent = `Last updated: ${now.toLocaleTimeString()}`;
                }
            }
        } catch (error) {
            console.error("Error fetching scores:", error);
            if (isManualRefresh) {
                statusMsg.textContent = "Failed to refresh scores.";
            }
        } finally {
            if (isManualRefresh) {
                setTimeout(() => refreshBtn.classList.remove('spin'), 500);
            }
        }
    }
    
    // Utility function to animate numbers counting up
    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }
    
    function initChart() {
        const ctx = document.getElementById('fundingChart').getContext('2d');
        
        if (chartInstance) {
            chartInstance.destroy();
        }
        
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Gold Coins (Jury)', 'Silver Coins (Public)'],
                datasets: [{
                    label: 'Investment Count',
                    data: [0, 0],
                    backgroundColor: [
                        'rgba(255, 215, 0, 0.8)', // Gold
                        'rgba(192, 192, 192, 0.8)' // Silver
                    ],
                    borderColor: [
                        'rgba(255, 215, 0, 1)',
                        'rgba(192, 192, 192, 1)'
                    ],
                    borderWidth: 1,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(10, 15, 30, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#8b9bb4',
                            stepSize: 1
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#8b9bb4'
                        }
                    }
                },
                animation: {
                    duration: 1500,
                    easing: 'easeOutQuart'
                }
            }
        });
    }
    
    function updateChart(gold, silver) {
        if (chartInstance) {
            chartInstance.data.datasets[0].data = [gold, silver];
            chartInstance.update();
        }
    }
});
