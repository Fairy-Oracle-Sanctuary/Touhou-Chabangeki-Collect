let filteredDramas = [...dramas];

function updateStats() {
    const total = dramas.length;
    const translated = dramas.filter(d => d.isTranslated).length;
    const untranslated = total - translated;

    document.getElementById('totalCount').textContent = total;
    document.getElementById('translatedCount').textContent = translated;
    document.getElementById('untranslatedCount').textContent = untranslated;
}

function filterAndSortDramas() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const sortBy = document.getElementById('sortBy').value;

    filteredDramas = dramas.filter(drama => {
        const matchesSearch = drama.title.toLowerCase().includes(searchTerm) ||
                              drama.author.toLowerCase().includes(searchTerm) ||
                              (drama.translator && drama.translator.toLowerCase().includes(searchTerm)) ||
                              drama.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
                              drama.description.toLowerCase().includes(searchTerm);

        const matchesStatus = statusFilter === 'all' ||
                             (statusFilter === 'translated' && drama.isTranslated) ||
                             (statusFilter === 'untranslated' && !drama.isTranslated);

        return matchesSearch && matchesStatus;
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
        <div class="bg-white rounded-xl shadow-md overflow-hidden card-hover transition-all duration-300">
            <div class="relative">
                <img src="${drama.thumbnail}" alt="${drama.title}" class="w-full h-48 object-cover">
                <div class="absolute top-2 right-2">
                    <span class="px-3 py-1 rounded-full text-white text-sm font-medium ${drama.isTranslated ? 'tag-translated' : 'tag-untranslated'}">
                        ${drama.isTranslated ? '已汉化' : '未汉化'}
                    </span>
                </div>
            </div>
            <div class="p-5">
                <h3 class="text-xl font-bold text-gray-800 mb-2 line-clamp-1">${drama.title}</h3>
                <p class="text-gray-600 text-sm mb-3 line-clamp-2">${drama.description}</p>
                <div class="flex flex-wrap gap-2 mb-4">
                    ${drama.tags.map(tag => `
                        <span class="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">${tag}</span>
                    `).join('')}
                </div>
                <div class="text-sm text-gray-500 mb-4">
                    <span>作者: ${drama.author}</span>
                    ${drama.translator ? `
                        <span class="mx-2">|</span>
                        <span>译者: ${drama.translator}</span>
                    ` : ''}
                    <span class="mx-2">|</span>
                    <span>添加于: ${drama.dateAdded}</span>
                </div>
                <div class="flex gap-2">
                    ${drama.isTranslated ? `
                        <a href="${drama.translatedUrl}" target="_blank" rel="noopener noreferrer" 
                           class="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white text-center py-2 px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-colors font-medium">
                            查看汉化版
                        </a>
                    ` : `
                        <a href="${drama.originalUrl}" target="_blank" rel="noopener noreferrer" 
                           class="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-center py-2 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors font-medium">
                            查看原版
                        </a>
                    `}
                    <a href="${drama.originalUrl}" target="_blank" rel="noopener noreferrer" 
                       class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                       title="查看原版">
                        🌐
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}

function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', filterAndSortDramas);
    document.getElementById('statusFilter').addEventListener('change', filterAndSortDramas);
    document.getElementById('sortBy').addEventListener('change', filterAndSortDramas);
}

function init() {
    updateStats();
    filterAndSortDramas();
    setupEventListeners();
}

document.addEventListener('DOMContentLoaded', init);