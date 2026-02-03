let filteredDramas = [...dramas];

// Theme Management
function initTheme() {
    const themeToggleBtn = document.getElementById('themeToggle');
    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');
    
    // Check for saved theme preference or system preference
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
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
    });
}

function updateStats() {
    const total = dramas.length;
    const translated = dramas.filter(d => d.isTranslated).length;
    const untranslated = total - translated;

    document.getElementById('totalCount').textContent = total;
    document.getElementById('translatedCount').textContent = translated;
    document.getElementById('untranslatedCount').textContent = untranslated;
}

// --- Statistics Logic ---
function getStats() {
    const tagCounts = {};
    const authorCounts = {};

    dramas.forEach(drama => {
        // Count Tags
        drama.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });

        // Count Authors
        authorCounts[drama.author] = (authorCounts[drama.author] || 0) + 1;
    });

    // Convert to array and sort by count (descending)
    const sortedTags = Object.entries(tagCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    const sortedAuthors = Object.entries(authorCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    return { sortedTags, sortedAuthors };
}

// --- Search Parser ---
function parseSearchInput(input) {
    const tags = [];
    const artists = [];
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

    // Clean up fuzzy term
    fuzzyTerm = fuzzyTerm.replace(/\s+/g, ' ').trim().toLowerCase();

    return { tags, artists, fuzzyTerm };
}

// --- Toggle Filter Helper ---
window.toggleFilter = function(type, value) {
    const searchInput = document.getElementById('searchInput');
    let currentInput = searchInput.value;
    const filterString = `${type}="${value}"`;
    
    // Check if filter already exists (case insensitive check for key, sensitive for value usually but here we use exact string match logic)
    // We need a robust check to avoid partial matches
    const regex = new RegExp(`${type}="${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'i');
    
    if (regex.test(currentInput)) {
        // Remove filter
        currentInput = currentInput.replace(regex, '').replace(/\s+/g, ' ').trim();
    } else {
        // Add filter
        currentInput = `${currentInput} ${filterString}`.trim();
    }

    searchInput.value = currentInput;
    searchInput.dispatchEvent(new Event('input'));
    
    // Scroll to top on mobile if adding a filter
    if (window.innerWidth < 1024 && !regex.test(searchInput.value)) { // If we just added it
        document.getElementById('dramaGrid').scrollIntoView({ behavior: 'smooth' });
    }
};

function renderSidebar() {
    const { sortedTags, sortedAuthors } = getStats();
    const tagCloud = document.getElementById('tagCloud');
    const authorList = document.getElementById('authorList');
    
    // Get current active filters to highlight them
    const searchInput = document.getElementById('searchInput');
    const { tags: activeTags, artists: activeArtists } = parseSearchInput(searchInput.value);

    // Render Tags (Top 20)
    tagCloud.innerHTML = sortedTags.slice(0, 20).map(tag => {
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
}

function filterAndSortDramas() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearch');
    const rawInput = searchInput.value;
    const statusFilter = document.getElementById('statusFilter').value;
    const sortBy = document.getElementById('sortBy').value;

    // Toggle Clear Button
    if (rawInput.trim()) {
        clearBtn.classList.remove('hidden');
    } else {
        clearBtn.classList.add('hidden');
    }

    // Parse Search Input
    const { tags: searchTags, artists: searchArtists, fuzzyTerm } = parseSearchInput(rawInput);

    filteredDramas = dramas.filter(drama => {
        // 1. Check Status
        const matchesStatus = statusFilter === 'all' ||
                             (statusFilter === 'translated' && drama.isTranslated) ||
                             (statusFilter === 'untranslated' && !drama.isTranslated);
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

        // 4. Check Fuzzy Term (if exists)
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
    detailTranslator.textContent = drama.translator || '无';
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
    
    // Show detail page
    detailPage.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeDetail() {
    const detailPage = document.getElementById('detailPage');
    detailPage.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

function renderDramas() {
    const grid = document.getElementById('dramaGrid');
    const noResults = document.getElementById('noResults');
    const resultsCount = document.getElementById('resultsCount');

    if (filteredDramas.length === 0) {
        grid.innerHTML = '';
        noResults.classList.remove('hidden');
        resultsCount.textContent = '';
        return;
    }

    noResults.classList.add('hidden');
    resultsCount.textContent = `显示 ${filteredDramas.length} 个结果`;

    grid.innerHTML = filteredDramas.map(drama => `
        <div class="group bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 hover:border-red-500/30 dark:hover:border-red-500/30 transition-colors duration-200 flex flex-col overflow-hidden cursor-pointer" onclick="openDetail(${JSON.stringify(drama).replace(/"/g, '&quot;')})">
            <!-- Thumbnail Container -->
            <div class="relative aspect-video overflow-hidden bg-gray-100 dark:bg-zinc-800">
                <img src="${drama.thumbnail}" alt="${drama.title}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onerror="this.src='https://via.placeholder.com/400x225/1e293b/475569?text=No+Image'">
                
                <!-- Status Badge -->
                <div class="absolute top-2 right-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-medium shadow-sm ${
                        drama.isTranslated 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                    }">
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
}

function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', filterAndSortDramas);
    
    // Listen for custom event from Alpine.js
    window.addEventListener('filter-change', (e) => {
        // The hidden inputs are already updated by x-model, but we need to trigger the filter logic
        filterAndSortDramas();
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
    initTheme();
    updateStats();
    renderSidebar(); // Initial render of sidebar
    filterAndSortDramas();
    setupEventListeners();
}

document.addEventListener('DOMContentLoaded', init);
