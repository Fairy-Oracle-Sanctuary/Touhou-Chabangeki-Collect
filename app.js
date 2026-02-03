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
    // 尝试从YouTube链接提取缩略图
    if (img.src.includes('youtube.com')) {
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
}

// 设置默认图片
function setDefaultImage(img, title) {
    // 检查是否处于深色模式
    const isDarkMode = document.documentElement.classList.contains('dark');
    const bgColor = isDarkMode ? '374151' : 'f3f4f6';
    const textColor = isDarkMode ? '9ca3af' : '6b7280';
    const titleText = title.length > 20 ? title.substring(0, 20) + '...' : title;
    
    // 使用text2image API生成自定义占位图
    const prompt = encodeURIComponent(`东方Project风格的抽象背景，${titleText}，简约设计`);
    const imageUrl = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${prompt}&image_size=landscape_16_9`;
    
    img.src = imageUrl;
    img.alt = title;
    
    // 添加加载状态样式
    img.classList.add('opacity-70');
    
    // 再次失败则使用纯色背景
    img.onerror = function() {
        img.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225' viewBox='0 0 400 225'%3E%3Crect width='400' height='225' fill='%23${bgColor}'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='14' fill='%23${textColor}' text-anchor='middle' dominant-baseline='middle'%3E${encodeURIComponent(titleText)}%3C/text%3E%3C/svg%3E`;
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
        <div class="group bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 hover:border-red-500/30 dark:hover:border-red-500/30 transition-colors duration-200 flex flex-col overflow-hidden cursor-pointer" onclick="openDetail(${JSON.stringify(drama).replace(/"/g, '&quot;')})"><!-- Thumbnail Container -->
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
        initTheme();
        updateStats();
        renderSidebar(); // Initial render of sidebar
        filterAndSortDramas();
        setupEventListeners();
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
        const newDrama = {
            id: dramas.length + 1, // Auto-increment ID
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
        navigator.clipboard.writeText(textToCopy).then(() => {
            // Show success message
            copySuccess.classList.remove('hidden');
            setTimeout(() => {
                copySuccess.classList.add('hidden');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy JSON:', err);
        });
    });
}

document.addEventListener('DOMContentLoaded', init);
