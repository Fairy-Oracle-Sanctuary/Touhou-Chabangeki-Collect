let filteredDramas = [...dramas];

// --- Favorites Management ---
function getFavorites() {
    try {
        const favorites = localStorage.getItem('touhou-favorites');
        return favorites ? JSON.parse(favorites) : [];
    } catch (error) {
        console.error('Error reading favorites from localStorage:', error);
        // Reset corrupted data
        try {
            localStorage.removeItem('touhou-favorites');
        } catch (clearError) {
            console.error('Error clearing corrupted favorites:', clearError);
        }
        return [];
    }
}

function saveFavorites(favorites) {
    try {
        localStorage.setItem('touhou-favorites', JSON.stringify(favorites));
    } catch (error) {
        console.error('Error saving favorites to localStorage:', error);
        // Show user-friendly error message
        alert('无法保存收藏数据，可能是存储空间不足或浏览器设置限制了本地存储。');
    }
}

function isFavorite(dramaId) {
    const favorites = getFavorites();
    return favorites.includes(dramaId);
}

function toggleFavorite(dramaId) {
    const favorites = getFavorites();
    const index = favorites.indexOf(dramaId);
    const wasAdded = index === -1;
    
    if (wasAdded) {
        favorites.push(dramaId);
    } else {
        favorites.splice(index, 1);
    }
    
    saveFavorites(favorites);
    
    // Update stats first (less expensive)
    updateStats();
    
    // Only re-render if the favorite status actually changed
    // and update specific elements instead of full re-render
    const favoriteButtons = document.querySelectorAll(`[onclick*="toggleFavorite(${dramaId})"]`);
    favoriteButtons.forEach(button => {
        const svg = button.querySelector('svg');
        const span = button.querySelector('span');
        
        if (wasAdded) {
            button.className = button.className.replace('border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400', 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30');
            svg.setAttribute('fill', 'currentColor');
            svg.classList.add('fill-current');
            span.textContent = '已收藏';
            button.title = '取消收藏';
        } else {
            button.className = button.className.replace('bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30', 'border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400');
            svg.setAttribute('fill', 'none');
            svg.classList.remove('fill-current');
            span.textContent = '收藏';
            button.title = '添加收藏';
        }
    });
    
    // Only re-render sidebar if stats changed significantly
    renderSidebar();
    
    // Re-render dramas only if currently filtering by favorites
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter && statusFilter.value === 'favorites') {
        renderDramas();
    }
}

function getFavoriteDramas() {
    const favorites = getFavorites();
    return dramas.filter(drama => favorites.includes(drama.id));
}

// Show favorites only
window.showFavoritesOnly = function() {
    const statusFilter = document.getElementById('statusFilter');
    
    // Set status filter to favorites
    if (statusFilter) {
        statusFilter.value = 'favorites';
        statusFilter.dispatchEvent(new Event('input', { bubbles: true }));
        statusFilter.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Try to find and update Alpine.js component directly
        const filterComponent = document.querySelector('[x-id*="filterComponent"]');
        if (filterComponent && filterComponent.__x) {
            filterComponent.__x.$data.status = 'favorites';
            filterComponent.__x.$data.updateFilters();
        }
        
        // Fallback: trigger custom event
        window.dispatchEvent(new CustomEvent('filter-change', { 
            detail: { status: 'favorites', sort: document.getElementById('sortBy')?.value || 'date-desc' } 
        }));
    }
    
    // Trigger filter update
    filterAndSortDramas();
    
    // Scroll to results
    document.getElementById('dramaGrid').scrollIntoView({ behavior: 'smooth' });
};

// --- Timeline ---
// Show timeline modal
window.showTimelineModal = function() {
    const timelineModal = document.getElementById('timelineModal');
    timelineModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Generate timeline content
    generateTimeline();
};

// Generate timeline content
function generateTimeline() {
    const timelineContent = document.getElementById('timelineContent');
    
    // Sort dramas by date
    const sortedDramas = [...dramas].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    
    // Group by year and month
    const groupedDramas = {};
    sortedDramas.forEach(drama => {
        const date = new Date(drama.dateAdded);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const key = `${year}年${month}月`;
        
        if (!groupedDramas[key]) {
            groupedDramas[key] = [];
        }
        groupedDramas[key].push(drama);
    });
    
    // Generate timeline HTML
    let timelineHTML = '';
    Object.keys(groupedDramas).forEach(period => {
        const periodDramas = groupedDramas[period];
        timelineHTML += `
            <div class="relative">
                <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-zinc-600"></div>
                <div class="relative flex items-start mb-6">
                    <div class="absolute left-0 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        ${periodDramas.length}
                    </div>
                    <div class="ml-12">
                        <h3 class="text-lg font-bold text-zinc-900 dark:text-white mb-3">${period}</h3>
                        <div class="space-y-3">
                            ${periodDramas.map(drama => `
                                <div class="bg-gray-50 dark:bg-zinc-800 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer" 
                                     data-drama="${btoa(unescape(encodeURIComponent(JSON.stringify(drama))))}"
                                     onclick="openDetailFromData(this)">
                                    <div class="flex items-start gap-3">
                                        <img src="${drama.thumbnail}" alt="${drama.title}" class="w-16 h-12 object-cover rounded">
                                        <div class="flex-1">
                                            <h4 class="font-medium text-zinc-900 dark:text-white">${drama.title}</h4>
                                            <p class="text-xs text-zinc-500 dark:text-zinc-400">${drama.author} • ${drama.isTranslated ? '已汉化' : '未汉化'}</p>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    timelineContent.innerHTML = timelineHTML;
}

// --- Related Works Recommendation ---
// Get related works based on tags and author
function getRelatedWorks(currentDrama, limit = 6) {
    const relatedScores = new Map();
    
    dramas.forEach(drama => {
        if (drama.id === currentDrama.id) return;
        
        let score = 0;
        
        // Same author (highest weight)
        if (drama.author === currentDrama.author) {
            score += 10;
        }
        
        // Same translator (high weight)
        if (drama.translator && currentDrama.translator && drama.translator === currentDrama.translator) {
            score += 8;
        }
        
        // Same tags (medium weight)
        const commonTags = drama.tags.filter(tag => currentDrama.tags.includes(tag));
        score += commonTags.length * 2;
        
        // Same translation status (low weight)
        if (drama.isTranslated === currentDrama.isTranslated) {
            score += 1;
        }
        
        if (score > 0) {
            relatedScores.set(drama, score);
        }
    });
    
    // Sort by score and return top results
    return Array.from(relatedScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([drama]) => drama);
}

// Render related works in detail page
function renderRelatedWorks(currentDrama) {
    const relatedWorksContainer = document.getElementById('relatedWorks');
    const relatedWorks = getRelatedWorks(currentDrama);
    
    if (relatedWorks.length === 0) {
        relatedWorksContainer.innerHTML = '<p class="text-sm text-zinc-500 dark:text-zinc-400">暂无相关推荐</p>';
        return;
    }
    
    relatedWorksContainer.innerHTML = relatedWorks.map(drama => `
        <div class="bg-gray-50 dark:bg-zinc-800 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer" 
             data-drama="${btoa(unescape(encodeURIComponent(JSON.stringify(drama))))}"
             onclick="openDetailFromData(this)">
            <div class="flex items-start gap-2">
                <img src="${drama.thumbnail}" alt="${drama.title}" class="w-12 h-9 object-cover rounded">
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-medium text-zinc-900 dark:text-white truncate">${drama.title}</h4>
                    <p class="text-xs text-zinc-500 dark:text-zinc-400">${drama.author}</p>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="px-1.5 py-0.5 rounded text-[8px] font-medium ${drama.isTranslated ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'}">
                            ${drama.isTranslated ? '已汉化' : '未汉化'}
                        </span>
                        ${isFavorite(drama.id) ? '<svg class="w-3 h-3 text-red-500 fill-current" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>' : ''}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// --- Batch Operations ---
// Show batch actions modal
window.showBatchActionsModal = function() {
    const batchActionsModal = document.getElementById('batchActionsModal');
    batchActionsModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

// Batch favorite all filtered items
function batchFavoriteAll() {
    const favorites = getFavorites();
    const newFavorites = new Set(favorites);
    
    filteredDramas.forEach(drama => {
        newFavorites.add(drama.id);
    });
    
    const updatedFavorites = Array.from(newFavorites);
    saveFavorites(updatedFavorites);
    updateStats();
    renderDramas();
    renderSidebar();
    
    // Show success message
    showBatchOperationMessage(`已收藏 ${filteredDramas.length} 个作品`);
}

// Batch unfavorite all filtered items
function batchUnfavoriteAll() {
    const favorites = getFavorites();
    const filteredIds = new Set(filteredDramas.map(d => d.id));
    const updatedFavorites = favorites.filter(id => !filteredIds.has(id));
    
    saveFavorites(updatedFavorites);
    updateStats();
    renderDramas();
    renderSidebar();
    
    // Show success message
    showBatchOperationMessage(`已取消收藏 ${filteredDramas.length} 个作品`);
}

// Export favorites as JSON
function exportFavorites() {
    const favorites = getFavorites();
    const favoriteDramas = dramas.filter(drama => favorites.includes(drama.id));
    
    const exportData = {
        exportDate: new Date().toISOString(),
        totalCount: favoriteDramas.length,
        favorites: favoriteDramas
    };
    
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // Create download link
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `touhou-favorites-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showBatchOperationMessage(`已导出 ${favoriteDramas.length} 个收藏作品`);
}

// Show batch operation message
function showBatchOperationMessage(message) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'fixed top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-md shadow-lg z-50 fade-in';
    msgDiv.textContent = message;
    document.body.appendChild(msgDiv);
    
    setTimeout(() => {
        msgDiv.remove();
    }, 3000);
}

// --- Personal Settings ---
let userSettings = {
    cardLayout: 'grid',
    itemsPerPage: 'all',
    defaultSort: 'date-desc',
    enableAnimations: true
};

// Load user settings
function loadUserSettings() {
    try {
        const saved = localStorage.getItem('touhou-settings');
        if (saved) {
            userSettings = { ...userSettings, ...JSON.parse(saved) };
        }
        applySettings();
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Save user settings
function saveUserSettings() {
    try {
        localStorage.setItem('touhou-settings', JSON.stringify(userSettings));
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('无法保存设置，可能是存储空间不足。');
    }
}

// Apply settings to UI
function applySettings() {
    // Apply card layout
    const grid = document.getElementById('dramaGrid');
    if (grid) {
        if (userSettings.cardLayout === 'list') {
            grid.className = 'space-y-4';
        } else {
            grid.className = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6';
        }
    }
    
    // Apply animations
    if (!userSettings.enableAnimations) {
        document.body.classList.add('no-animations');
    } else {
        document.body.classList.remove('no-animations');
    }
    
    // Apply default sort
    const sortBy = document.getElementById('sortBy');
    if (sortBy && userSettings.defaultSort) {
        sortBy.value = userSettings.defaultSort;
    }
}

// Show settings modal
window.showSettingsModal = function() {
    const settingsModal = document.getElementById('settingsModal');
    settingsModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Load current settings into form
    document.querySelector(`input[name="cardLayout"][value="${userSettings.cardLayout}"]`).checked = true;
    document.getElementById('itemsPerPage').value = userSettings.itemsPerPage;
    document.getElementById('defaultSort').value = userSettings.defaultSort;
    document.getElementById('enableAnimations').checked = userSettings.enableAnimations;
};

// --- Statistics Charts ---
let translationChartInstance = null;
let monthlyChartInstance = null;
let authorsChartInstance = null;
let translatorsChartInstance = null;

// Show charts modal
window.showChartsModal = function() {
    const chartsModal = document.getElementById('chartsModal');
    chartsModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Initialize charts after modal is visible
    setTimeout(() => {
        initializeCharts();
    }, 100);
};

// Initialize all charts
function initializeCharts() {
    const isDarkMode = document.documentElement.classList.contains('dark');
    const textColor = isDarkMode ? '#e5e7eb' : '#374151';
    const gridColor = isDarkMode ? '#374151' : '#e5e7eb';
    
    // Destroy existing charts
    if (translationChartInstance) translationChartInstance.destroy();
    if (monthlyChartInstance) monthlyChartInstance.destroy();
    if (authorsChartInstance) authorsChartInstance.destroy();
    if (translatorsChartInstance) translatorsChartInstance.destroy();
    
    // Translation Progress Pie Chart
    const translationCtx = document.getElementById('translationChart').getContext('2d');
    const translatedCount = dramas.filter(d => d.isTranslated).length;
    const untranslatedCount = dramas.length - translatedCount;
    const percentage = Math.round((translatedCount / dramas.length) * 100);
    
    document.getElementById('translationPercentage').textContent = percentage + '%';
    
    translationChartInstance = new Chart(translationCtx, {
        type: 'doughnut',
        data: {
            labels: ['已汉化', '未汉化'],
            datasets: [{
                data: [translatedCount, untranslatedCount],
                backgroundColor: ['#10b981', '#f59e0b'],
                borderColor: isDarkMode ? '#1f2937' : '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor }
                }
            }
        }
    });
    
    // Monthly Trend Line Chart
    const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
    const monthlyData = getMonthlyData();
    
    monthlyChartInstance = new Chart(monthlyCtx, {
        type: 'line',
        data: {
            labels: monthlyData.labels,
            datasets: [{
                label: '发布作品',
                data: monthlyData.data,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                },
                y: {
                    ticks: { color: textColor, stepSize: 1 },
                    grid: { color: gridColor },
                    beginAtZero: true
                }
            }
        }
    });
    
    // Top Authors Bar Chart
    const authorsCtx = document.getElementById('authorsChart').getContext('2d');
    const authorData = getTopAuthorsData();
    
    authorsChartInstance = new Chart(authorsCtx, {
        type: 'bar',
        data: {
            labels: authorData.labels,
            datasets: [{
                label: '作品数量',
                data: authorData.data,
                backgroundColor: '#3b82f6',
                borderColor: isDarkMode ? '#1e40af' : '#1d4ed8',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    ticks: { color: textColor, stepSize: 1 },
                    grid: { color: gridColor },
                    beginAtZero: true
                },
                y: {
                    ticks: { color: textColor },
                    grid: { display: false }
                }
            }
        }
    });
    
    // Top Translators Bar Chart
    const translatorsCtx = document.getElementById('translatorsChart').getContext('2d');
    const translatorData = getTopTranslatorsData();
    
    translatorsChartInstance = new Chart(translatorsCtx, {
        type: 'bar',
        data: {
            labels: translatorData.labels,
            datasets: [{
                label: '汉化作品数量',
                data: translatorData.data,
                backgroundColor: '#8b5cf6',
                borderColor: isDarkMode ? '#6d28d9' : '#7c3aed',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    ticks: { color: textColor, stepSize: 1 },
                    grid: { color: gridColor },
                    beginAtZero: true
                },
                y: {
                    ticks: { color: textColor },
                    grid: { display: false }
                }
            }
        }
    });
}

// Get monthly data for trend chart
function getMonthlyData() {
    const monthlyCount = {};
    const currentYear = new Date().getFullYear();
    
    dramas.forEach(drama => {
        const date = new Date(drama.dateAdded);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const key = `${year}-${month.toString().padStart(2, '0')}`;
        
        if (!monthlyCount[key]) {
            monthlyCount[key] = 0;
        }
        monthlyCount[key]++;
    });
    
    // Sort by date and get last 6 months
    const sortedMonths = Object.keys(monthlyCount).sort();
    const lastSixMonths = sortedMonths.slice(-6);
    
    return {
        labels: lastSixMonths,
        data: lastSixMonths.map(month => monthlyCount[month] || 0)
    };
}

// Get top authors data
function getTopAuthorsData() {
    const authorCounts = {};
    
    dramas.forEach(drama => {
        authorCounts[drama.author] = (authorCounts[drama.author] || 0) + 1;
    });
    
    const sortedAuthors = Object.entries(authorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8); // Top 8 authors
    
    return {
        labels: sortedAuthors.map(([author]) => author),
        data: sortedAuthors.map(([, count]) => count)
    };
}

// Get top translators data
function getTopTranslatorsData() {
    const translatorCounts = {};
    
    dramas.forEach(drama => {
        if (drama.isTranslated && drama.translator) {
            translatorCounts[drama.translator] = (translatorCounts[drama.translator] || 0) + 1;
        }
    });
    
    const sortedTranslators = Object.entries(translatorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8); // Top 8 translators
    
    return {
        labels: sortedTranslators.map(([translator]) => translator),
        data: sortedTranslators.map(([, count]) => count)
    };
}

// --- Keyboard Shortcuts ---
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+K or Cmd+K to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            searchInput.focus();
            searchInput.select();
        }
        
        // Ctrl+Shift+F or Cmd+Shift+F to show favorites (avoid browser search conflict)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
            e.preventDefault();
            showFavoritesOnly();
        }
        
        // Escape to close detail page or clear search
        if (e.key === 'Escape') {
            const detailPage = document.getElementById('detailPage');
            const submitModal = document.getElementById('submitModal');
            const searchInput = document.getElementById('searchInput');
            
            if (!detailPage.classList.contains('hidden')) {
                closeDetail();
            } else if (!submitModal.classList.contains('hidden')) {
                closeSubmitModalFunc();
            } else if (searchInput.value.trim()) {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
            }
        }
        
        // Ctrl+Enter to submit form when modal is open
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const submitModal = document.getElementById('submitModal');
            const submitForm = document.getElementById('submitForm');
            
            if (!submitModal.classList.contains('hidden')) {
                e.preventDefault();
                submitForm.dispatchEvent(new Event('submit'));
            }
        }
    });
}
function initTheme() {
    const themeToggleBtn = document.getElementById('themeToggle');
    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');
    
    // Check for saved theme preference or system preference
    let savedTheme;
    try {
        savedTheme = localStorage.theme;
    } catch (error) {
        console.error('Error reading theme from localStorage:', error);
        savedTheme = null;
    }
    
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    }

    // Toggle theme
    themeToggleBtn.addEventListener('click', () => {
        try {
            if (document.documentElement.classList.contains('dark')) {
                document.documentElement.classList.remove('dark');
                localStorage.theme = 'light';
                sunIcon.classList.add('hidden');
                moonIcon.classList.remove('hidden');
            } else {
                document.documentElement.classList.add('dark');
                localStorage.theme = 'dark';
                sunIcon.classList.remove('hidden');
                moonIcon.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error saving theme to localStorage:', error);
            // Continue without saving - theme will still work for this session
        }
    });
}

function updateStats() {
    const total = dramas.length;
    const translated = dramas.filter(d => d.isTranslated).length;
    const untranslated = total - translated;
    const favorites = getFavorites().length;

    document.getElementById('totalCount').textContent = total;
    document.getElementById('translatedCount').textContent = translated;
    document.getElementById('untranslatedCount').textContent = untranslated;
    
    // Add favorites count if element exists
    const favoritesElement = document.getElementById('favoritesCount');
    if (favoritesElement) {
        favoritesElement.textContent = favorites;
    }
}

// --- Statistics Logic ---
function getStats() {
    const tagCounts = {};
    const authorCounts = {};
    const translatorCounts = {};

    dramas.forEach(drama => {
        // Count Tags
        drama.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });

        // Count Authors
        authorCounts[drama.author] = (authorCounts[drama.author] || 0) + 1;
        
        // Count Translators
        if (drama.translator) {
            translatorCounts[drama.translator] = (translatorCounts[drama.translator] || 0) + 1;
        }
    });

    // Convert to array and sort by count (descending)
    const sortedTags = Object.entries(tagCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    const sortedAuthors = Object.entries(authorCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    const sortedTranslators = Object.entries(translatorCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    return { sortedTags, sortedAuthors, sortedTranslators };
}

// --- Search Parser --- 
function parseSearchInput(input) {
    const tags = [];
    const artists = [];
    const translators = [];
    let fuzzyTerm = input;

    // Extract tags: tag="value"
    const tagRegex = /tag="([^"]+)"/gi;
    let match;
    while ((match = tagRegex.exec(input)) !== null) {
        tags.push(match[1].toLowerCase());
    }
    fuzzyTerm = fuzzyTerm.replace(tagRegex, '');

    // Extract artists: artist="value"
    const artistRegex = /artist="([^"]+)"/gi;
    while ((match = artistRegex.exec(input)) !== null) {
        artists.push(match[1].toLowerCase());
    }
    fuzzyTerm = fuzzyTerm.replace(artistRegex, '');

    // Extract translators: translator="value"
    const translatorRegex = /translator="([^"]+)"/gi;
    while ((match = translatorRegex.exec(input)) !== null) {
        translators.push(match[1].toLowerCase());
    }
    fuzzyTerm = fuzzyTerm.replace(translatorRegex, '');

    // Clean up fuzzy term
    fuzzyTerm = fuzzyTerm.replace(/\s+/g, ' ').trim().toLowerCase();

    return { tags, artists, translators, fuzzyTerm };
}

// --- Toggle Filter Helper --- 
window.toggleFilter = function(type, value) {
    const searchInput = document.getElementById('searchInput');
    let currentInput = searchInput.value;
    const filterString = `${type}="${value}"`;
    
    // Check if filter already exists (case insensitive check for key, sensitive for value usually but here we use exact string match logic)
    // We need a robust check to avoid partial matches
    const regex = new RegExp(`${type}="${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'i');
    
    // For artists and translators, ensure only one is selected at a time
    if (type === 'artist') {
        // Remove all existing artist filters
        currentInput = currentInput.replace(/artist="[^"]+"/gi, '').replace(/\s+/g, ' ').trim();
        
        // Add the new artist filter
        currentInput = `${currentInput} ${filterString}`.trim();
    } else if (type === 'translator') {
        // Remove all existing translator filters
        currentInput = currentInput.replace(/translator="[^"]+"/gi, '').replace(/\s+/g, ' ').trim();
        
        // Add the new translator filter
        currentInput = `${currentInput} ${filterString}`.trim();
    } else {
        // For other filter types (tags), keep the existing toggle behavior
        if (regex.test(currentInput)) {
            // Remove filter
            currentInput = currentInput.replace(regex, '').replace(/\s+/g, ' ').trim();
        } else {
            // Add filter
            currentInput = `${currentInput} ${filterString}`.trim();
        }
    }

    searchInput.value = currentInput;
    searchInput.dispatchEvent(new Event('input'));
    
    // Scroll to top on mobile if adding a filter
    if (window.innerWidth < 1024 && !regex.test(searchInput.value)) { // If we just added it
        document.getElementById('dramaGrid').scrollIntoView({ behavior: 'smooth' });
    }
};

// 标签展开状态
let tagsExpanded = false;

// 切换标签展开状态
function toggleTagsExpanded() {
    tagsExpanded = !tagsExpanded;
    renderSidebar();
}

// 搜索补全功能
function initSearchAutocomplete() {
    const searchInput = document.getElementById('searchInput');
    const autocompleteDropdown = document.getElementById('autocompleteDropdown');
    const autocompleteList = document.getElementById('autocompleteList');
    let autocompleteTimeout;

    // 生成补全建议
    function generateAutocompleteSuggestions(input) {
        if (!input || input.length < 1) return [];

        const inputLower = input.toLowerCase();
        const suggestions = [];
        const seen = new Set();

        // 搜索标题
        dramas.forEach(drama => {
            if (drama.title.toLowerCase().includes(inputLower) && !seen.has(drama.title)) {
                seen.add(drama.title);
                suggestions.push({
                    type: 'title',
                    value: drama.title,
                    label: drama.title,
                    count: 1
                });
            }
        });

        // 搜索作者
        const authorCounts = {};
        dramas.forEach(drama => {
            if (drama.author.toLowerCase().includes(inputLower)) {
                authorCounts[drama.author] = (authorCounts[drama.author] || 0) + 1;
            }
        });
        Object.entries(authorCounts).forEach(([author, count]) => {
            if (!seen.has(author)) {
                seen.add(author);
                suggestions.push({
                    type: 'artist',
                    value: author,
                    label: author,
                    count: count
                });
            }
        });

        // 搜索译者
        const translatorCounts = {};
        dramas.forEach(drama => {
            if (drama.translator && drama.translator.toLowerCase().includes(inputLower)) {
                translatorCounts[drama.translator] = (translatorCounts[drama.translator] || 0) + 1;
            }
        });
        Object.entries(translatorCounts).forEach(([translator, count]) => {
            if (!seen.has(translator)) {
                seen.add(translator);
                suggestions.push({
                    type: 'translator',
                    value: translator,
                    label: translator,
                    count: count
                });
            }
        });

        // 搜索标签
        const tagCounts = {};
        dramas.forEach(drama => {
            drama.tags.forEach(tag => {
                if (tag.toLowerCase().includes(inputLower)) {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                }
            });
        });
        Object.entries(tagCounts).forEach(([tag, count]) => {
            if (!seen.has(tag)) {
                seen.add(tag);
                suggestions.push({
                    type: 'tag',
                    value: tag,
                    label: tag,
                    count: count
                });
            }
        });

        // 限制最多显示10个建议
        return suggestions.slice(0, 10);
    }

    // 渲染补全建议
    function renderAutocompleteSuggestions(suggestions) {
        if (suggestions.length === 0) {
            autocompleteDropdown.classList.add('hidden');
            return;
        }

        autocompleteList.innerHTML = suggestions.map(suggestion => {
            let typeLabel, typeClass;
            switch (suggestion.type) {
                case 'title':
                    typeLabel = '标题';
                    typeClass = 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
                    break;
                case 'artist':
                    typeLabel = '作者';
                    typeClass = 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
                    break;
                case 'translator':
                    typeLabel = '译者';
                    typeClass = 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400';
                    break;
                case 'tag':
                    typeLabel = '标签';
                    typeClass = 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400';
                    break;
            }

            return `
                <li>
                    <button 
                        onclick="selectAutocompleteSuggestion('${suggestion.type}', '${suggestion.value}')" 
                        class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors flex items-center justify-between"
                    >
                        <div>
                            <span>${suggestion.label}</span>
                            <span class="ml-2 text-xs px-1.5 py-0.5 rounded ${typeClass}">${typeLabel}</span>
                        </div>
                        <span class="text-xs text-zinc-500 dark:text-zinc-400">${suggestion.count}</span>
                    </button>
                </li>
            `;
        }).join('');

        autocompleteDropdown.classList.remove('hidden');
    }

    // 隐藏补全下拉菜单
    function hideAutocompleteDropdown() {
        autocompleteDropdown.classList.add('hidden');
    }

    // 输入事件监听
    searchInput.addEventListener('input', (e) => {
        clearTimeout(autocompleteTimeout);
        const input = e.target.value.trim();

        autocompleteTimeout = setTimeout(() => {
            const suggestions = generateAutocompleteSuggestions(input);
            renderAutocompleteSuggestions(suggestions);
        }, 200);
    });

    // 点击外部隐藏下拉菜单
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
            hideAutocompleteDropdown();
        }
    });

    // 键盘导航
    searchInput.addEventListener('keydown', (e) => {
        const activeItem = autocompleteList.querySelector('.bg-gray-100 dark:bg-zinc-700');
        const allItems = autocompleteList.querySelectorAll('li button');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (activeItem) {
                activeItem.classList.remove('bg-gray-100', 'dark:bg-zinc-700');
                const nextItem = activeItem.parentElement.nextElementSibling?.querySelector('button');
                if (nextItem) {
                    nextItem.classList.add('bg-gray-100', 'dark:bg-zinc-700');
                    nextItem.scrollIntoView({ block: 'nearest' });
                } else {
                    allItems[0]?.classList.add('bg-gray-100', 'dark:bg-zinc-700');
                }
            } else {
                allItems[0]?.classList.add('bg-gray-100', 'dark:bg-zinc-700');
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (activeItem) {
                activeItem.classList.remove('bg-gray-100', 'dark:bg-zinc-700');
                const prevItem = activeItem.parentElement.previousElementSibling?.querySelector('button');
                if (prevItem) {
                    prevItem.classList.add('bg-gray-100', 'dark:bg-zinc-700');
                    prevItem.scrollIntoView({ block: 'nearest' });
                } else {
                    allItems[allItems.length - 1]?.classList.add('bg-gray-100', 'dark:bg-zinc-700');
                }
            } else {
                allItems[allItems.length - 1]?.classList.add('bg-gray-100', 'dark:bg-zinc-700');
            }
        } else if (e.key === 'Enter') {
            if (activeItem) {
                e.preventDefault();
                activeItem.click();
            }
        } else if (e.key === 'Escape') {
            hideAutocompleteDropdown();
        }
    });
}

// 选择补全建议
window.selectAutocompleteSuggestion = function(type, value) {
    const searchInput = document.getElementById('searchInput');
    
    if (type === 'title') {
        // 直接搜索标题
        searchInput.value = value;
    } else {
        // 使用过滤器语法
        toggleFilter(type, value);
    }
    
    // 触发搜索
    searchInput.dispatchEvent(new Event('input'));
    
    // 隐藏下拉菜单
    document.getElementById('autocompleteDropdown').classList.add('hidden');
};

// 处理图片加载失败
function handleImageError(img, title) {
    try {
        // 尝试从YouTube链接提取缩略图
        if (img.src && img.src.includes('youtube.com')) {
            const videoIdMatch = img.src.match(/[?&]v=([^&]+)/);
            if (videoIdMatch && videoIdMatch[1]) {
                const videoId = videoIdMatch[1];
                const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
                img.src = thumbnailUrl;
                // 再次失败则使用默认图片
                img.onerror = function() {
                    setDefaultImage(img, title);
                };
                return;
            }
        }
        
        // 使用默认图片
        setDefaultImage(img, title);
    } catch (error) {
        console.error('Error handling image error:', error);
        setDefaultImage(img, title);
    }
}

// 设置默认图片
function setDefaultImage(img, title) {
    // 检查是否处于深色模式
    const isDarkMode = document.documentElement.classList.contains('dark');
    const bgColor = isDarkMode ? '374151' : 'f3f4f6';
    const textColor = isDarkMode ? '9ca3af' : '6b7280';
    const titleText = title.length > 20 ? title.substring(0, 20) + '...' : title;
    
    // 防止无限循环
    if (img.dataset.fallbackAttempted) {
        img.onerror = null; // 清除错误处理器
        img.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225' viewBox='0 0 400 225'%3E%3Crect width='400' height='225' fill='%23${bgColor}'/%3E%3Ctext x='50%25' y='50%25' font-family='system-ui,-apple-system,sans-serif' font-size='16' font-weight='500' fill='%23${textColor}' text-anchor='middle' dominant-baseline='middle'%3E${encodeURIComponent(titleText)}%3C/text%3E%3C/svg%3E`;
        return;
    }
    
    img.dataset.fallbackAttempted = 'true';
    
    // 第一层fallback：尝试使用通用的占位图服务
    const fallbackUrl = `https://picsum.photos/seed/${encodeURIComponent(title)}/400/225.jpg`;
    img.src = fallbackUrl;
    img.alt = title;
    
    // 添加加载状态样式
    img.classList.add('opacity-70');
    
    // 第二层fallback：如果通用服务也失败，使用SVG占位图
    img.onerror = function() {
        img.onerror = null; // 防止无限循环
        img.classList.remove('opacity-70');
        img.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225' viewBox='0 0 400 225'%3E%3Crect width='400' height='225' fill='%23${bgColor}'/%3E%3Ctext x='50%25' y='50%25' font-family='system-ui,-apple-system,sans-serif' font-size='16' font-weight='500' fill='%23${textColor}' text-anchor='middle' dominant-baseline='middle'%3E${encodeURIComponent(titleText)}%3C/text%3E%3C/svg%3E`;
    };
}

function renderSidebar() {
    const { sortedTags, sortedAuthors, sortedTranslators } = getStats();
    const tagCloud = document.getElementById('tagCloud');
    const authorList = document.getElementById('authorList');
    const translatorList = document.getElementById('translatorList');
    
    // Get current active filters to highlight them
    const searchInput = document.getElementById('searchInput');
    const { tags: activeTags, artists: activeArtists, translators: activeTranslators } = parseSearchInput(searchInput.value);

    // 决定显示的标签数量
    const displayCount = tagsExpanded ? sortedTags.length : 20;
    const displayTags = sortedTags.slice(0, displayCount);
    
    // Render Tags
    tagCloud.innerHTML = displayTags.map(tag => {
        const isActive = activeTags.includes(tag.name.toLowerCase());
        const activeClass = isActive 
            ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' 
            : 'bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-gray-200 dark:border-zinc-700 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400';
            
        return `
            <button onclick="toggleFilter('tag', '${tag.name}')" 
                    class="px-2 py-1 text-xs rounded border transition-colors ${activeClass}">
                #${tag.name} <span class="opacity-60 ml-0.5 text-[10px]">(${tag.count})</span>
            </button>
        `;
    }).join('');
    
    // 添加展开/折叠按钮
    if (sortedTags.length > 20) {
        const toggleText = tagsExpanded ? '收起' : '展开全部';
        const remainingCount = sortedTags.length - 20;
        const buttonText = tagsExpanded ? toggleText : `${toggleText} (${remainingCount}个)`;
        
        tagCloud.innerHTML += `
            <button onclick="toggleTagsExpanded()" 
                    class="mt-3 px-3 py-1.5 text-xs rounded bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">
                ${buttonText}
            </button>
        `;
    }

    // Render Authors (Top 10)
    authorList.innerHTML = sortedAuthors.slice(0, 10).map(author => {
        const isActive = activeArtists.includes(author.name.toLowerCase());
        const activeClass = isActive
            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium'
            : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400';
            
        return `
            <button onclick="toggleFilter('artist', '${author.name}')" 
                    class="w-full text-left px-2 py-1.5 text-xs rounded transition-colors flex justify-between items-center group ${activeClass}">
                <span class="truncate">${author.name}</span>
                <span class="text-[10px] bg-gray-100 dark:bg-zinc-800 group-hover:bg-white dark:group-hover:bg-zinc-700 px-1.5 py-0.5 rounded-full transition-colors">${author.count}</span>
            </button>
        `;
    }).join('');

    // Render Translators (Top 10)
    if (translatorList) {
        translatorList.innerHTML = sortedTranslators.slice(0, 10).map(translator => {
            const isActive = activeTranslators.includes(translator.name.toLowerCase());
            const activeClass = isActive
                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium'
                : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400';
                
            return `
                <button onclick="toggleFilter('translator', '${translator.name}')" 
                        class="w-full text-left px-2 py-1.5 text-xs rounded transition-colors flex justify-between items-center group ${activeClass}">
                    <span class="truncate">${translator.name}</span>
                    <span class="text-[10px] bg-gray-100 dark:bg-zinc-800 group-hover:bg-white dark:group-hover:bg-zinc-700 px-1.5 py-0.5 rounded-full transition-colors">${translator.count}</span>
                </button>
            `;
        }).join('');
    }
}

function filterAndSortDramas() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearch');
    const rawInput = searchInput.value;
    
    // Get status and sort values from both Alpine.js hidden inputs and direct DOM access
    const statusFilterElement = document.getElementById('statusFilter');
    const sortByElement = document.getElementById('sortBy');
    
    const statusFilter = statusFilterElement ? statusFilterElement.value : 'all';
    const sortBy = sortByElement ? sortByElement.value : 'date-desc';

    // Toggle Clear Button
    if (rawInput.trim()) {
        clearBtn.classList.remove('hidden');
    } else {
        clearBtn.classList.add('hidden');
    }

    // Parse Search Input
    const { tags: searchTags, artists: searchArtists, translators: searchTranslators, fuzzyTerm } = parseSearchInput(rawInput);

    filteredDramas = dramas.filter(drama => {
        // 1. Check Status
        const matchesStatus = statusFilter === 'all' ||
                             (statusFilter === 'translated' && drama.isTranslated) ||
                             (statusFilter === 'untranslated' && !drama.isTranslated) ||
                             (statusFilter === 'favorites' && isFavorite(drama.id));
        if (!matchesStatus) return false;

        // 2. Check Tags (AND logic: must contain ALL searched tags)
        if (searchTags.length > 0) {
            const hasAllTags = searchTags.every(searchTag => 
                drama.tags.some(tag => tag.toLowerCase() === searchTag)
            );
            if (!hasAllTags) return false;
        }

        // 3. Check Artists (AND logic: must match ALL searched artists - usually implies only one artist can be selected effectively unless data changes)
        if (searchArtists.length > 0) {
            const hasAllArtists = searchArtists.every(searchArtist => 
                drama.author.toLowerCase() === searchArtist
            );
            if (!hasAllArtists) return false;
        }

        // 4. Check Translators (AND logic: must match ALL searched translators - usually implies only one translator can be selected effectively unless data changes)
        if (searchTranslators.length > 0) {
            const hasAllTranslators = searchTranslators.every(searchTranslator => 
                drama.translator && drama.translator.toLowerCase() === searchTranslator
            );
            if (!hasAllTranslators) return false;
        }

        // 5. Check Fuzzy Term (if exists)
        if (fuzzyTerm) {
            const matchesFuzzy = drama.title.toLowerCase().includes(fuzzyTerm) ||
                                 drama.author.toLowerCase().includes(fuzzyTerm) ||
                                 (drama.translator && drama.translator.toLowerCase().includes(fuzzyTerm)) ||
                                 drama.tags.some(tag => tag.toLowerCase().includes(fuzzyTerm)) ||
                                 drama.description.toLowerCase().includes(fuzzyTerm);
            if (!matchesFuzzy) return false;
        }

        return true;
    });

    filteredDramas.sort((a, b) => {
        switch(sortBy) {
            case 'date-desc':
                return new Date(b.dateAdded) - new Date(a.dateAdded);
            case 'date-asc':
                return new Date(a.dateAdded) - new Date(b.dateAdded);
            case 'name-asc':
                return a.title.localeCompare(b.title);
            case 'name-desc':
                return b.title.localeCompare(a.title);
            default:
                return 0;
        }
    });

    renderDramas();
    renderSidebar(); // Re-render sidebar to update active states
}

function openDetail(drama) {
    const detailPage = document.getElementById('detailPage');
    const detailThumbnail = document.getElementById('detailThumbnail');
    const detailStatus = document.getElementById('detailStatus');
    const detailTitle = document.getElementById('detailTitle');
    const detailAuthor = document.getElementById('detailAuthor');
    const detailDate = document.getElementById('detailDate');
    const detailTranslator = document.getElementById('detailTranslator');
    const detailDescription = document.getElementById('detailDescription');
    const detailTags = document.getElementById('detailTags');
    const detailTranslatedLink = document.getElementById('detailTranslatedLink');
    const detailOriginalLink = document.getElementById('detailOriginalLink');
    
    // Fill data
    detailThumbnail.src = drama.thumbnail;
    detailThumbnail.alt = drama.title;
    
    detailStatus.className = `px-2 py-0.5 rounded text-[10px] font-medium shadow-sm ${drama.isTranslated ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800'}`;
    detailStatus.textContent = drama.isTranslated ? '已汉化' : '未汉化';
    
    detailTitle.textContent = drama.title;
    detailAuthor.innerHTML = `<button onclick="toggleFilter('artist', '${drama.author}')" class="hover:text-red-600 dark:hover:text-red-400 transition-colors hover:underline">${drama.author}</button>`;
    detailDate.textContent = drama.dateAdded;
    detailTranslator.innerHTML = drama.translator ? `<button onclick="toggleFilter('translator', '${drama.translator}')" class="hover:text-red-600 dark:hover:text-red-400 transition-colors hover:underline">${drama.translator}</button>` : '无';
    detailDescription.textContent = drama.description;
    
    // Fill tags
    detailTags.innerHTML = drama.tags.map(tag => `
        <button onclick="toggleFilter('tag', '${tag}')" class="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-all">
            #${tag}
        </button>
    `).join('');
    
    // Fill links
    if (drama.isTranslated && drama.translatedUrl) {
        detailTranslatedLink.href = drama.translatedUrl;
        detailTranslatedLink.classList.remove('hidden');
    } else {
        detailTranslatedLink.classList.add('hidden');
    }
    detailOriginalLink.href = drama.originalUrl;
    
    // Add favorite button to detail links
    // Remove any existing favorite buttons first (more thorough cleanup)
    const detailLinksContainer = detailTranslatedLink.parentElement;
    
    // Remove all buttons that contain "收藏" text or have favorite functionality
    const existingButtons = detailLinksContainer.querySelectorAll('button');
    existingButtons.forEach(button => {
        const buttonText = button.textContent || button.innerText;
        if (buttonText && (buttonText.includes('收藏') || buttonText.includes('添加') || buttonText.includes('取消'))) {
            button.remove();
        }
    });
    
    // Also remove any elements with data-favorite attribute (if we add it in future)
    const favoriteElements = detailLinksContainer.querySelectorAll('[data-favorite]');
    favoriteElements.forEach(element => element.remove());
    
    const favoriteButton = document.createElement('button');
    favoriteButton.setAttribute('data-favorite', 'true'); // Add marker for future cleanup
    favoriteButton.onclick = (e) => {
        e.stopPropagation(); // Prevent event bubbling
        toggleFavorite(drama.id);
        
        // Update button UI after toggle
        const isNowFavorite = isFavorite(drama.id);
        favoriteButton.className = `flex items-center justify-center gap-1.5 py-2 px-4 rounded border transition-colors ${
            isNowFavorite 
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30' 
            : 'border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400'
        }`;
        favoriteButton.innerHTML = `
            <svg class="w-4 h-4 ${isNowFavorite ? 'fill-current' : ''}" fill="${isNowFavorite ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
            <span>${isNowFavorite ? '取消收藏' : '添加收藏'}</span>
        `;
        favoriteButton.title = isNowFavorite ? '取消收藏' : '添加收藏';
        
        // Update stats and sidebar
        updateStats();
        renderSidebar();
    };
    favoriteButton.className = `flex items-center justify-center gap-1.5 py-2 px-4 rounded border transition-colors ${
        isFavorite(drama.id) 
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30' 
        : 'border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400'
    }`;
    favoriteButton.innerHTML = `
        <svg class="w-4 h-4 ${isFavorite(drama.id) ? 'fill-current' : ''}" fill="${isFavorite(drama.id) ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
        </svg>
        <span>${isFavorite(drama.id) ? '取消收藏' : '添加收藏'}</span>
    `;
    
    // Insert favorite button before the links
    detailLinksContainer.insertBefore(favoriteButton, detailTranslatedLink);
    
    // Render related works
    renderRelatedWorks(drama);
    
    // Show detail page
    detailPage.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeDetail() {
    const detailPage = document.getElementById('detailPage');
    detailPage.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// Safe function to open detail from data attribute
function openDetailFromData(element) {
    try {
        const dramaData = element.dataset.drama;
        if (!dramaData) {
            console.error('No drama data found');
            return;
        }
        
        const drama = JSON.parse(decodeURIComponent(escape(atob(dramaData))));
        openDetail(drama);
    } catch (error) {
        console.error('Error parsing drama data:', error);
    }
}

function renderDramas() {
    const grid = document.getElementById('dramaGrid');
    const noResults = document.getElementById('noResults');
    const resultsCount = document.getElementById('resultsCount');
    const statusFilter = document.getElementById('statusFilter');

    if (filteredDramas.length === 0) {
        grid.innerHTML = '';
        noResults.classList.remove('hidden');
        resultsCount.textContent = '';
        
        // Update no results message based on filter
        const noResultsTitle = noResults.querySelector('h3');
        const noResultsText = noResults.querySelector('p');
        
        if (statusFilter && statusFilter.value === 'favorites') {
            noResultsTitle.textContent = '暂无收藏作品';
            noResultsText.textContent = '点击作品卡片上的收藏按钮来添加收藏';
        } else {
            noResultsTitle.textContent = '无搜索结果';
            noResultsText.textContent = '请尝试调整关键词';
        }
        
        return;
    }

    noResults.classList.add('hidden');
    resultsCount.textContent = `显示 ${filteredDramas.length} 个结果`;

    // Add loading state briefly for better UX
    grid.innerHTML = '<div class="col-span-full flex justify-center py-8"><div class="spinner"></div></div>';
    
    setTimeout(() => {
        grid.innerHTML = filteredDramas.map((drama, index) => `
            <div class="drama-card group bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 hover:border-red-500/30 dark:hover:border-red-500/30 transition-colors duration-200 flex flex-col overflow-hidden cursor-pointer fade-in" 
                 style="animation-delay: ${index * 50}ms"
                 data-drama="${btoa(unescape(encodeURIComponent(JSON.stringify(drama))))}"
                 onclick="openDetailFromData(this)">
                <!-- Thumbnail Container -->
                <div class="relative aspect-video overflow-hidden bg-gray-100 dark:bg-zinc-800">
                    <img src="${drama.thumbnail}" alt="${drama.title}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onerror="handleImageError(this, '${drama.title}')">
                    
                    <!-- Status Badge -->
                    <div class="absolute top-2 right-2">
                        <span class="px-2 py-0.5 rounded text-[10px] font-medium shadow-sm ${drama.isTranslated ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800'}">
                            ${drama.isTranslated ? '已汉化' : '未汉化'}
                        </span>
                    </div>
                </div>

                <!-- Content -->
                <div class="p-4 flex-1 flex flex-col">
                    <div class="mb-2">
                        <h3 class="text-base font-bold text-zinc-900 dark:text-white mb-1 line-clamp-1 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                            ${drama.title}
                        </h3>
                        <div class="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
                            <button onclick="toggleFilter('artist', '${drama.author}'); event.stopPropagation();" class="hover:text-red-600 dark:hover:text-red-400 transition-colors hover:underline">
                                ${drama.author}
                            </button>
                            <span>•</span>
                            <span>${drama.dateAdded}</span>
                            ${drama.translator ? `<span>•</span><span>${drama.translator}</span>` : ''}
                        </div>
                    </div>

                    <p class="text-xs text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2 flex-grow leading-relaxed">
                        ${drama.description}
                    </p>

                    <!-- Tags -->
                    <div class="flex flex-wrap gap-1.5 mb-4">
                        ${drama.tags.slice(0, 3).map(tag => `
                            <button onclick="toggleFilter('tag', '${tag}'); event.stopPropagation();" class="px-1.5 py-0.5 text-[10px] rounded bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-all">
                                #${tag}
                            </button>
                        `).join('')}
                        ${drama.tags.length > 3 ? `<span class="text-[10px] text-zinc-400 py-0.5">+${drama.tags.length - 3}</span>` : ''}
                    </div>

                    <!-- Actions -->
                    <div class="flex gap-2 mt-auto pt-3 border-t border-gray-100 dark:border-zinc-800">
                        <!-- Favorite Button -->
                        <button onclick="toggleFavorite(${drama.id}); event.stopPropagation();" 
                                class="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded border transition-colors ${
                                    isFavorite(drama.id) 
                                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30' 
                                    : 'border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400'
                                }"
                                title="${isFavorite(drama.id) ? '取消收藏' : '添加收藏'}">
                            <svg class="w-3.5 h-3.5 ${isFavorite(drama.id) ? 'fill-current' : ''}" fill="${isFavorite(drama.id) ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                            </svg>
                            <span class="text-xs">${isFavorite(drama.id) ? '已收藏' : '收藏'}</span>
                        </button>
                        
                        ${drama.isTranslated && drama.translatedUrl ? `
                            <a href="${drama.translatedUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();"
                               class="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors">
                                <span>观看汉化</span>
                            </a>
                        ` : ''}
                        
                        <a href="${drama.originalUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();"
                           class="${drama.isTranslated ? 'px-2.5' : 'flex-1'} flex items-center justify-center gap-1.5 py-1.5 rounded border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors"
                           title="查看原版">
                            ${!drama.isTranslated ? '<span>查看原版</span>' : ''}
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                        </a>
                    </div>
                </div>
            </div>
        `).join('');
    }, 100); // Small delay for loading animation
}

function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', filterAndSortDramas);
    
    // Listen for custom event from Alpine.js
    window.addEventListener('filter-change', (e) => {
        // The hidden inputs are already updated by x-model, but we need to trigger the filter logic
        filterAndSortDramas();
    });
    
    // Setup direct event listeners for hidden inputs
    const statusFilter = document.getElementById('statusFilter');
    const sortBy = document.getElementById('sortBy');
    
    if (statusFilter) {
        statusFilter.addEventListener('input', filterAndSortDramas);
        statusFilter.addEventListener('change', filterAndSortDramas);
    }
    
    if (sortBy) {
        sortBy.addEventListener('input', filterAndSortDramas);
        sortBy.addEventListener('change', filterAndSortDramas);
    }
    
    // Setup MutationObserver as backup
    if (statusFilter && sortBy) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                    filterAndSortDramas();
                }
            });
        });
        
        observer.observe(statusFilter, { attributes: true, attributeFilter: ['value'] });
        observer.observe(sortBy, { attributes: true, attributeFilter: ['value'] });
    }
    
    // Timeline modal events
    const timelineModal = document.getElementById('timelineModal');
    const closeTimelineModal = document.getElementById('closeTimelineModal');
    
    closeTimelineModal.addEventListener('click', () => {
        timelineModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    });
    
    timelineModal.addEventListener('click', (e) => {
        if (e.target === timelineModal) {
            timelineModal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    });
    
    // Batch actions modal events
    const batchActionsBtn = document.getElementById('batchActionsBtn');
    const batchActionsModal = document.getElementById('batchActionsModal');
    const closeBatchActionsModal = document.getElementById('closeBatchActionsModal');
    const batchFavoriteBtn = document.getElementById('batchFavoriteBtn');
    const batchUnfavoriteBtn = document.getElementById('batchUnfavoriteBtn');
    const exportFavoritesBtn = document.getElementById('exportFavoritesBtn');
    
    batchActionsBtn.addEventListener('click', showBatchActionsModal);
    
    closeBatchActionsModal.addEventListener('click', () => {
        batchActionsModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    });
    
    batchActionsModal.addEventListener('click', (e) => {
        if (e.target === batchActionsModal) {
            batchActionsModal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    });
    
    batchFavoriteBtn.addEventListener('click', () => {
        batchActionsModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        batchFavoriteAll();
    });
    
    batchUnfavoriteBtn.addEventListener('click', () => {
        batchActionsModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        batchUnfavoriteAll();
    });
    
    exportFavoritesBtn.addEventListener('click', () => {
        batchActionsModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        exportFavorites();
    });
    
    // Settings modal events
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsModal = document.getElementById('closeSettingsModal');
    const saveSettingsBtn = document.getElementById('saveSettings');
    const resetSettingsBtn = document.getElementById('resetSettings');
    
    settingsBtn.addEventListener('click', showSettingsModal);
    
    closeSettingsModal.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    });
    
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    });
    
    saveSettingsBtn.addEventListener('click', () => {
        // Get form values
        userSettings.cardLayout = document.querySelector('input[name="cardLayout"]:checked').value;
        userSettings.itemsPerPage = document.getElementById('itemsPerPage').value;
        userSettings.defaultSort = document.getElementById('defaultSort').value;
        userSettings.enableAnimations = document.getElementById('enableAnimations').checked;
        
        // Save and apply settings
        saveUserSettings();
        applySettings();
        
        // Close modal and show success message
        settingsModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        
        // Show success feedback
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-md shadow-lg z-50 fade-in';
        successMsg.textContent = '设置已保存';
        document.body.appendChild(successMsg);
        
        setTimeout(() => {
            successMsg.remove();
        }, 3000);
    });
    
    resetSettingsBtn.addEventListener('click', () => {
        // Reset to defaults
        userSettings = {
            cardLayout: 'grid',
            itemsPerPage: 'all',
            defaultSort: 'date-desc',
            enableAnimations: true
        };
        
        // Update form
        document.querySelector('input[name="cardLayout"][value="grid"]').checked = true;
        document.getElementById('itemsPerPage').value = 'all';
        document.getElementById('defaultSort').value = 'date-desc';
        document.getElementById('enableAnimations').checked = true;
        
        // Apply defaults
        applySettings();
    });
    
    // Shortcuts modal events
    const shortcutsBtn = document.getElementById('shortcutsBtn');
    const shortcutsModal = document.getElementById('shortcutsModal');
    const closeShortcutsModal = document.getElementById('closeShortcutsModal');
    
    shortcutsBtn.addEventListener('click', () => {
        shortcutsModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    });
    
    closeShortcutsModal.addEventListener('click', () => {
        shortcutsModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    });
    
    shortcutsModal.addEventListener('click', (e) => {
        if (e.target === shortcutsModal) {
            shortcutsModal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    });
    
    // Charts modal events
    const chartsModal = document.getElementById('chartsModal');
    const closeChartsModal = document.getElementById('closeChartsModal');
    
    closeChartsModal.addEventListener('click', () => {
        chartsModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    });
    
    chartsModal.addEventListener('click', (e) => {
        if (e.target === chartsModal) {
            chartsModal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    });
    
    // Clear Search Button
    document.getElementById('clearSearch').addEventListener('click', () => {
        const searchInput = document.getElementById('searchInput');
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
    });
    
    // Detail Page Events
    document.getElementById('closeDetail').addEventListener('click', closeDetail);
    
    // Close detail page when clicking outside
    document.getElementById('detailPage').addEventListener('click', (e) => {
        if (e.target === document.getElementById('detailPage')) {
            closeDetail();
        }
    });
}

function init() {
    // Wait for DOM to be fully loaded and Alpine.js to initialize
    setTimeout(() => {
        // Add fade-in animation to body
        document.body.classList.add('fade-in');
        document.body.style.opacity = '1';
        
        // Load user settings first
        loadUserSettings();
        
        initTheme();
        updateStats();
        renderSidebar(); // Initial render of sidebar
        filterAndSortDramas();
        setupEventListeners();
        setupKeyboardShortcuts(); // Setup keyboard shortcuts
        initSearchAutocomplete(); // Initialize search autocomplete
        setupSubmitForm();
    }, 100); // Small delay to ensure Alpine.js is ready
}

function setupSubmitForm() {
    const submitBtn = document.getElementById('submitBtn');
    const submitModal = document.getElementById('submitModal');
    const closeSubmitModal = document.getElementById('closeSubmitModal');
    const cancelSubmit = document.getElementById('cancelSubmit');
    const submitForm = document.getElementById('submitForm');
    const jsonOutput = document.getElementById('jsonOutput');
    const jsonCode = document.getElementById('jsonCode');
    const copyJson = document.getElementById('copyJson');
    const copySuccess = document.getElementById('copySuccess');

    // Dropdown elements
    const authorInput = document.getElementById('author');
    const authorDropdownBtn = document.getElementById('authorDropdownBtn');
    const authorDropdown = document.getElementById('authorDropdown');
    const submitAuthorList = document.getElementById('submitAuthorList');
    
    const translatorInput = document.getElementById('translator');
    const translatorDropdownBtn = document.getElementById('translatorDropdownBtn');
    const translatorDropdown = document.getElementById('translatorDropdown');
    const submitTranslatorList = document.getElementById('submitTranslatorList');
    
    const tagInput = document.getElementById('tags');
    const tagDropdownBtn = document.getElementById('tagDropdownBtn');
    const tagDropdown = document.getElementById('tagDropdown');
    const submitTagList = document.getElementById('submitTagList');

    // Extract unique authors, translators, and tags from existing dramas
    function extractUniqueData() {
        const authors = new Set();
        const translators = new Set();
        const tags = new Set();

        dramas.forEach(drama => {
            authors.add(drama.author);
            if (drama.translator) {
                translators.add(drama.translator);
            }
            drama.tags.forEach(tag => {
                tags.add(tag);
            });
        });

        return {
            authors: Array.from(authors).sort(),
            translators: Array.from(translators).sort(),
            tags: Array.from(tags).sort()
        };
    }

    // Populate dropdowns
    function populateDropdowns() {
        const { authors, translators, tags } = extractUniqueData();

        // Populate authors
        submitAuthorList.innerHTML = authors.map(author => `
            <li>
                <button type="button" class="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors" data-author="${author}">
                    ${author}
                </button>
            </li>
        `).join('');

        // Populate translators
        submitTranslatorList.innerHTML = translators.map(translator => `
            <li>
                <button type="button" class="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors" data-translator="${translator}">
                    ${translator}
                </button>
            </li>
        `).join('');

        // Populate tags
        submitTagList.innerHTML = tags.map(tag => `
            <button type="button" class="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors" data-tag="${tag}">
                #${tag}
            </button>
        `).join('');
    }

    // Toggle dropdown
    function toggleDropdown(dropdown) {
        dropdown.classList.toggle('hidden');
    }

    // Close all dropdowns
    function closeAllDropdowns() {
        authorDropdown.classList.add('hidden');
        translatorDropdown.classList.add('hidden');
        tagDropdown.classList.add('hidden');
    }

    // Open submit modal
    submitBtn.addEventListener('click', () => {
        submitModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        // Populate dropdowns when modal opens
        populateDropdowns();
    });

    // Close submit modal
    function closeSubmitModalFunc() {
        submitModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        // Reset form and JSON output
        submitForm.reset();
        jsonOutput.classList.add('hidden');
        closeAllDropdowns();
    }

    closeSubmitModal.addEventListener('click', closeSubmitModalFunc);
    cancelSubmit.addEventListener('click', closeSubmitModalFunc);

    // Close submit modal when clicking outside
    submitModal.addEventListener('click', (e) => {
        if (e.target === submitModal) {
            closeSubmitModalFunc();
        }
    });

    // Author dropdown
    authorDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(authorDropdown);
        translatorDropdown.classList.add('hidden');
        tagDropdown.classList.add('hidden');
    });

    // Translator dropdown
    translatorDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(translatorDropdown);
        authorDropdown.classList.add('hidden');
        tagDropdown.classList.add('hidden');
    });

    // Tag dropdown
    tagDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(tagDropdown);
        authorDropdown.classList.add('hidden');
        translatorDropdown.classList.add('hidden');
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!authorDropdown.contains(e.target) && !authorDropdownBtn.contains(e.target)) {
            authorDropdown.classList.add('hidden');
        }
        if (!translatorDropdown.contains(e.target) && !translatorDropdownBtn.contains(e.target)) {
            translatorDropdown.classList.add('hidden');
        }
        if (!tagDropdown.contains(e.target) && !tagDropdownBtn.contains(e.target)) {
            tagDropdown.classList.add('hidden');
        }
    });

    // Handle author selection
    submitAuthorList.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const author = e.target.dataset.author;
            authorInput.value = author;
            authorDropdown.classList.add('hidden');
        }
    });

    // Handle translator selection
    submitTranslatorList.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const translator = e.target.dataset.translator;
            translatorInput.value = translator;
            translatorDropdown.classList.add('hidden');
        }
    });

    // Handle tag selection
    submitTagList.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const tag = e.target.dataset.tag;
            const currentTags = tagInput.value
                ? tagInput.value.split(',').map(t => t.trim()).filter(t => t)
                : [];
            
            if (!currentTags.includes(tag)) {
                currentTags.push(tag);
                tagInput.value = currentTags.join(', ');
            }
        }
    });

    // Handle form submission
    submitForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Get form data
        const formData = new FormData(submitForm);
        const formValues = Object.fromEntries(formData);

        // Validate form data
        const errors = [];

        // Required fields
        if (!formValues.title || formValues.title.trim() === '') {
            errors.push('请输入标题');
        }

        if (!formValues.author || formValues.author.trim() === '') {
            errors.push('请输入作者');
        }

        if (!formValues.originalUrl || formValues.originalUrl.trim() === '') {
            errors.push('请输入原版链接');
        }

        // URL validation
        const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
        if (formValues.originalUrl && !urlPattern.test(formValues.originalUrl)) {
            errors.push('原版链接格式不正确');
        }

        if (formValues.translatedUrl && !urlPattern.test(formValues.translatedUrl)) {
            errors.push('汉化链接格式不正确');
        }

        if (formValues.thumbnail && !urlPattern.test(formValues.thumbnail)) {
            errors.push('封面图链接格式不正确');
        }

        // Date validation
        if (!formValues.dateAdded) {
            errors.push('请选择添加日期');
        } else {
            const datePattern = /^\d{4}-\d{2}-\d{2}$/;
            if (!datePattern.test(formValues.dateAdded)) {
                errors.push('日期格式不正确，请使用 YYYY-MM-DD 格式');
            }
        }

        // Show errors if any
        if (errors.length > 0) {
            alert('请修正以下错误：\n' + errors.join('\n'));
            return;
        }

        // Process tags
        const tags = formValues.tags
            ? formValues.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
            : [];

        // Create drama object
        const newId = dramas.length > 0 ? Math.max(...dramas.map(d => d.id)) + 1 : 1;
        const newDrama = {
            id: newId, // Safe ID generation
            title: formValues.title.trim(),
            author: formValues.author.trim(),
            translator: formValues.translator ? formValues.translator.trim() : '',
            tags: tags,
            isTranslated: formValues.isTranslated === 'true',
            originalUrl: formValues.originalUrl.trim(),
            translatedUrl: formValues.translatedUrl ? formValues.translatedUrl.trim() : '',
            description: formValues.description ? formValues.description.trim() : '',
            thumbnail: formValues.thumbnail ? formValues.thumbnail.trim() : '',
            dateAdded: formValues.dateAdded
        };

        // Validate JSON generation
        try {
            // Generate JSON
            const jsonString = JSON.stringify(newDrama, null, 2);
            jsonCode.textContent = jsonString;
            jsonOutput.classList.remove('hidden');

            // Scroll to JSON output
            jsonOutput.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            alert('生成JSON时出错：' + error.message);
            return;
        }
    });

    // Copy JSON to clipboard
    copyJson.addEventListener('click', () => {
        const textToCopy = jsonCode.textContent;
        
        if (!textToCopy) {
            console.error('No text to copy');
            return;
        }
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                // Show success message
                copySuccess.classList.remove('hidden');
                setTimeout(() => {
                    copySuccess.classList.add('hidden');
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy JSON:', err);
                // Fallback for older browsers
                copyToClipboardFallback(textToCopy);
            });
        } else {
            // Fallback for older browsers
            copyToClipboardFallback(textToCopy);
        }
    });
    
    // Fallback clipboard copy function
    function copyToClipboardFallback(text) {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                copySuccess.classList.remove('hidden');
                setTimeout(() => {
                    copySuccess.classList.add('hidden');
                }, 2000);
            } else {
                console.error('Fallback copy failed');
                alert('复制失败，请手动复制文本');
            }
        } catch (err) {
            console.error('Fallback copy error:', err);
            alert('复制失败，请手动复制文本');
        }
    }
}

document.addEventListener('DOMContentLoaded', init);
