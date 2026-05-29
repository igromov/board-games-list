let gamesData = [];
let allTags = new Set();
let activeTagFilters = new Set();
let activePlayersFilter = null;
let activeLearningFilter = null;
let activeTimeFilter = null;

const LEARNING_TIME_RANGES = {
    'моментально': { max: 3 },
    'быстро':      { min: 4, max: 10 },
    'долго':       { min: 11 }
};

const PLAYTIME_RANGES = {
    'короткая': { max: 30 },
    'средняя':  { min: 31, max: 60 },
    'длинная':  { min: 61 }
};

async function loadGames() {
    try {
        const response = await fetch('games_database.json', { cache: 'no-cache' });
        const data = await response.json();
        gamesData = data.games;

        gamesData.forEach(game => game.tags.forEach(tag => allTags.add(tag)));

        renderTagFilters();
        setupFilterButtons();
        renderGames(gamesData);
        updateStats();
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

function setupFilterButtons() {
    setupSingleFilter('#playersFilter', () => activePlayersFilter, v => { activePlayersFilter = v; });
    setupSingleFilter('#learningFilter', () => activeLearningFilter, v => { activeLearningFilter = v; });
    setupSingleFilter('#timeFilter', () => activeTimeFilter, v => { activeTimeFilter = v; });
}

function setupSingleFilter(selector, getter, setter) {
    document.querySelectorAll(`${selector} .filter-btn`).forEach(btn => {
        btn.addEventListener('click', function () {
            const value = this.dataset.value;
            const current = getter();
            document.querySelectorAll(`${selector} .filter-btn`).forEach(b => b.classList.remove('active'));
            if (current === value) {
                setter(null);
            } else {
                setter(value);
                this.classList.add('active');
            }
            filterGames();
        });
    });
}

function renderTagFilters() {
    const container = document.getElementById('tagsFilter');
    const sortedTags = Array.from(allTags).sort();
    container.innerHTML = sortedTags.map(tag =>
        `<div class="filter-btn tag" onclick="toggleTagFilter('${tag.replace(/'/g, "\\'")}')">${tag}</div>`
    ).join('');
}

function toggleTagFilter(tag) {
    if (activeTagFilters.has(tag)) {
        activeTagFilters.delete(tag);
    } else {
        activeTagFilters.add(tag);
    }
    document.querySelectorAll('#tagsFilter .filter-btn').forEach(el => {
        if (el.textContent === tag) {
            el.classList.toggle('active', activeTagFilters.has(tag));
        }
    });
    filterGames();
}

function buildMeta(game) {
    const chips = [];

    // Players chip
    if (game.playersMax > 0) {
        let playersText = `${game.playersMin}–${game.playersMax}`;
        if (game.playersMinRecommend > 0) {
            playersText += ` (👍 ${game.playersMinRecommend}–${game.playersMaxRecommend})`;
        }
        chips.push(`<span class="meta-chip" title="Количество игроков"><span class="emoji" aria-hidden="true">👥</span>${playersText}</span>`);
    }

    // Time chip
    if (game.playtimeMax > 0) {
        const timeText = game.playtimeMin > 0
            ? `${game.playtimeMin}–${game.playtimeMax} мин`
            : `до ${game.playtimeMax} мин`;
        chips.push(`<span class="meta-chip" title="Время партии"><span class="emoji" aria-hidden="true">⏱️</span>${timeText}</span>`);
    }

    // Learning chip
    if (game.timeToLearn > 0) {
        chips.push(`<span class="meta-chip" title="Время на обучение"><span class="emoji" aria-hidden="true">🎓</span>${game.timeToLearn} мин</span>`);
    }

    // Quantity chip (only if > 1)
    if (game.quantity > 1) {
        chips.push(`<span class="meta-chip qty" title="Количество копий в коллекции"><span class="emoji" aria-hidden="true">📦</span>${game.quantity}</span>`);
    }

    return chips.join('');
}

function renderGames(games) {
    const grid = document.getElementById('gamesGrid');
    const noResults = document.getElementById('noResults');

    if (games.length === 0) {
        grid.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }

    grid.style.display = 'grid';
    noResults.style.display = 'none';

    const shuffled = [...games].sort(() => Math.random() - 0.5);

    grid.innerHTML = shuffled.map(game => {
        const linkText = game.link
            ? `<a href="${game.link}" target="_blank" rel="noopener">${game.name}</a>`
            : game.name;

        let imageHtml = '';
        if (game.photoUrl) {
            const imgTag = `<img src="${game.photoUrl}" alt="${game.name}" class="game-image" loading="lazy">`;
            imageHtml = game.link
                ? `<a href="${game.link}" target="_blank" rel="noopener" class="game-image-link">${imgTag}</a>`
                : `<div class="game-image-link">${imgTag}</div>`;
        } else {
            imageHtml = `<div class="game-image-link" style="display:none"></div>`;
        }

        const descHtml = game.descriptionShort?.trim()
            ? `<div class="game-description">${game.descriptionShort}</div>`
            : '';

        const tagsHtml = game.tags.length
            ? `<div class="game-tags">${game.tags.map(tag => {
                const isActive = activeTagFilters.has(tag);
                return `<span class="tag ${isActive ? 'highlight' : ''}" onclick="toggleTagFilter('${tag.replace(/'/g, "\\'")}')">${tag}</span>`;
            }).join('')}</div>`
            : '';

        return `
      <div class="game-card">
        ${imageHtml}
        <div class="game-content">
          <h3>${linkText}</h3>
          <div class="game-meta">${buildMeta(game)}</div>
          ${descHtml}
          ${tagsHtml}
        </div>
      </div>`;
    }).join('');
}

function filterGames() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();

    const filtered = gamesData.filter(game => {
        if (searchTerm && !game.name.toLowerCase().includes(searchTerm)) return false;

        if (activePlayersFilter) {
            const req = parseInt(activePlayersFilter);
            const min = game.playersMinRecommend > 0 ? game.playersMinRecommend : game.playersMin;
            const max = game.playersMaxRecommend > 0 ? game.playersMaxRecommend : game.playersMax;
            if (req < min || req > max) return false;
        }

        if (activeLearningFilter) {
            const range = LEARNING_TIME_RANGES[activeLearningFilter];
            const t = game.timeToLearn;
            if (range.max !== undefined && t > range.max) return false;
            if (range.min !== undefined && t < range.min) return false;
        }

        if (activeTimeFilter) {
            const range = PLAYTIME_RANGES[activeTimeFilter];
            const t = game.playtimeMax;
            if (range.max !== undefined && t > range.max) return false;
            if (range.min !== undefined && t < range.min) return false;
        }

        if (activeTagFilters.size > 0) {
            if (!Array.from(activeTagFilters).every(tag => game.tags.includes(tag))) return false;
        }

        return true;
    });

    renderGames(filtered);
    document.getElementById('shownGames').textContent = filtered.length;
}

function updateStats() {
    document.getElementById('totalGames').textContent = gamesData.length;
    document.getElementById('shownGames').textContent = gamesData.length;
}

function resetFilters() {
    document.getElementById('searchBox').value = '';
    activePlayersFilter = null;
    activeLearningFilter = null;
    activeTimeFilter = null;
    activeTagFilters.clear();
    document.querySelectorAll('.filter-btn').forEach(el => el.classList.remove('active'));
    filterGames();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchBox').addEventListener('input', filterGames);
    loadGames();
});