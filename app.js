// Nifty 50 Stocks Dashboard Application Logic

// Application State
let state = {
    timeframe: '1D', // '1D', '30D', '365D'
    searchQuery: '',
    selectedSector: 'ALL',
    sortColumn: 'symbol',
    sortDirection: 'asc',
    currentPage: 1,
    itemsPerPage: 10
};

// DOM Elements
const timeButtons = document.querySelectorAll('.timeframe-btn');
const searchInput = document.getElementById('search-input');
const sectorFilter = document.getElementById('sector-filter');
const tableBody = document.getElementById('table-body');
const paginationInfo = document.getElementById('pagination-info');
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');

// Stats Cards DOM Elements
const niftyValEl = document.getElementById('nifty-val');
const niftyChangeEl = document.getElementById('nifty-change');
const avgReturnEl = document.getElementById('avg-return');
const gainersCountEl = document.getElementById('gainers-count');
const losersCountEl = document.getElementById('losers-count');
const topPerformerEl = document.getElementById('top-performer');
const topPerformerValEl = document.getElementById('top-performer-val');
const worstPerformerEl = document.getElementById('worst-performer');
const worstPerformerValEl = document.getElementById('worst-performer-val');

// Modal Elements
const modalOverlay = document.getElementById('modal-overlay');
const closeModalBtn = document.getElementById('close-modal-btn');

// Chart variables
let rankingChart = null;
let scatterChart = null;

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    populateSectorFilter();
    setupEventListeners();
    updateNiftyIndexHeader();
    updateDashboard();
});

// Populate Sector Dropdown
function populateSectorFilter() {
    const sectors = new Set();
    stockData.forEach(stock => {
        if (stock.sector) sectors.add(stock.sector);
    });
    
    // Sort sectors alphabetically and add to select
    const sortedSectors = Array.from(sectors).sort();
    sortedSectors.forEach(sector => {
        const option = document.createElement('option');
        option.value = sector;
        option.textContent = sector;
        sectorFilter.appendChild(option);
    });
}

// Setup Event Listeners
function setupEventListeners() {
    // Timeframe Toggles
    timeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            timeButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.timeframe = e.target.dataset.tf;
            state.currentPage = 1;
            updateDashboard();
        });
    });

    // Search input
    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        state.currentPage = 1;
        updateTable();
    });

    // Sector select
    sectorFilter.addEventListener('change', (e) => {
        state.selectedSector = e.target.value;
        state.currentPage = 1;
        updateDashboard(); // Charts should also update with sector filter
    });

    // Pagination
    prevPageBtn.addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            updateTable();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        const maxPage = Math.ceil(getFilteredData().length / state.itemsPerPage);
        if (state.currentPage < maxPage) {
            state.currentPage++;
            updateTable();
        }
    });

    // Table sorting
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if (state.sortColumn === col) {
                state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortColumn = col;
                state.sortDirection = 'desc'; // Default to desc for performance values, etc.
            }
            
            // Update UI headers
            document.querySelectorAll('th').forEach(header => {
                header.classList.remove('sort-active', 'sort-asc', 'sort-desc');
            });
            th.classList.add('sort-active', state.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
            
            updateTable();
        });
    });

    // Close modal handlers
    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
            closeModal();
        }
    });
}

// Formatting Helpers
function formatNumber(num, decimals = 2) {
    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(num);
}

function formatPercent(val) {
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(2)}%`;
}

function formatVolume(val) {
    if (val >= 10000000) {
        return `${(val / 10000000).toFixed(2)} Cr`;
    } else if (val >= 100000) {
        return `${(val / 100000).toFixed(2)} L`;
    }
    return formatNumber(val, 0);
}

// Get the correct percentage change key depending on state
function getChangeKey() {
    if (state.timeframe === '30D') return 'thirtyDayPercentChange';
    if (state.timeframe === '365D') return 'threeSixtyFiveDayPercentChange';
    return 'percentChange';
}

// Filter the stocks based on search query and sector choice
function getFilteredData() {
    return stockData.filter(stock => {
        const matchesSearch = stock.symbol.toLowerCase().includes(state.searchQuery) ||
                              stock.sector.toLowerCase().includes(state.searchQuery);
        const matchesSector = state.selectedSector === 'ALL' || stock.sector === state.selectedSector;
        return matchesSearch && matchesSector;
    });
}

// Sort stock array
function getSortedData(data) {
    const key = state.sortColumn;
    const dir = state.sortDirection === 'asc' ? 1 : -1;
    
    return [...data].sort((a, b) => {
        let valA = a[key];
        let valB = b[key];
        
        // Custom keys mapping for active timeframe
        if (key === 'activeChange') {
            const chgKey = getChangeKey();
            valA = a[chgKey];
            valB = b[chgKey];
        }
        
        // Handle undefined or strings
        if (typeof valA === 'string') {
            return valA.localeCompare(valB) * dir;
        }
        
        return (valA - valB) * dir;
    });
}

// Update Top Nifty Index Info
function updateNiftyIndexHeader() {
    niftyValEl.textContent = formatNumber(niftyIndex.ltp);
    
    const change = niftyIndex.change;
    const pct = niftyIndex.percentChange;
    const textClass = pct >= 0 ? 'gain-text' : 'loss-text';
    const bgClass = pct >= 0 ? 'gain-bg' : 'loss-bg';
    
    niftyChangeEl.className = `nifty-change ${textClass} ${bgClass}`;
    niftyChangeEl.innerHTML = `${pct >= 0 ? '▲' : '▼'} ${formatNumber(Math.abs(change))} (${formatPercent(pct)})`;
    
    // Set other timeframe badges in the top bar
    document.getElementById('nifty-30d').textContent = formatPercent(niftyIndex.thirtyDayPercentChange);
    document.getElementById('nifty-30d').className = niftyIndex.thirtyDayPercentChange >= 0 ? 'gain-text' : 'loss-text';
    
    document.getElementById('nifty-365d').textContent = formatPercent(niftyIndex.threeSixtyFiveDayPercentChange);
    document.getElementById('nifty-365d').className = niftyIndex.threeSixtyFiveDayPercentChange >= 0 ? 'gain-text' : 'loss-text';
}

// Update the statistics cards
function updateStatsCards(data) {
    if (data.length === 0) {
        avgReturnEl.textContent = '-';
        gainersCountEl.textContent = '-';
        losersCountEl.textContent = '-';
        topPerformerEl.textContent = '-';
        topPerformerValEl.textContent = '';
        worstPerformerEl.textContent = '-';
        worstPerformerValEl.textContent = '';
        return;
    }

    const key = getChangeKey();
    
    // Average Return
    const totalReturn = data.reduce((sum, stock) => sum + stock[key], 0);
    const avgReturn = totalReturn / data.length;
    avgReturnEl.textContent = formatPercent(avgReturn);
    avgReturnEl.className = `metric-value ${avgReturn >= 0 ? 'gain-text' : 'loss-text'}`;
    
    // Gainers & Losers
    const gainers = data.filter(stock => stock[key] > 0).length;
    const losers = data.length - gainers;
    gainersCountEl.textContent = gainers;
    losersCountEl.textContent = losers;
    
    // Top & Worst Performers
    const sorted = [...data].sort((a, b) => a[key] - b[key]);
    const worst = sorted[0];
    const top = sorted[sorted.length - 1];
    
    topPerformerEl.textContent = top.symbol;
    topPerformerValEl.textContent = formatPercent(top[key]);
    topPerformerValEl.className = 'gain-text';
    
    worstPerformerEl.textContent = worst.symbol;
    worstPerformerValEl.textContent = formatPercent(worst[key]);
    worstPerformerValEl.className = 'loss-text';
}

// Update Table Display
function updateTable() {
    const filtered = getFilteredData();
    const sorted = getSortedData(filtered);
    
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = Math.min(startIndex + state.itemsPerPage, sorted.length);
    const pageData = sorted.slice(startIndex, endIndex);
    
    // Update pagination stats
    paginationInfo.textContent = `Showing ${filtered.length > 0 ? startIndex + 1 : 0} to ${endIndex} of ${filtered.length} entries`;
    prevPageBtn.disabled = state.currentPage === 1;
    nextPageBtn.disabled = endIndex >= filtered.length;
    
    tableBody.innerHTML = '';
    
    if (pageData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 40px;">No stocks match your query.</td></tr>`;
        return;
    }
    
    const chgKey = getChangeKey();
    
    pageData.forEach(stock => {
        const tr = document.createElement('tr');
        tr.addEventListener('click', () => showStockDetail(stock));
        
        const returnVal = stock[chgKey];
        const returnClass = returnVal >= 0 ? 'gain-text' : 'loss-text';
        
        // 52-Week Progress Marker Position
        // Percent of current price relative to the 52W range
        const high = stock.fiftyTwoWeekHigh;
        const low = stock.fiftyTwoWeekLow;
        const ltp = stock.ltp;
        let progressPercent = 50; // default
        if (high > low) {
            progressPercent = ((ltp - low) / (high - low)) * 100;
            progressPercent = Math.max(0, Math.min(100, progressPercent)); // clamp
        }
        
        tr.innerHTML = `
            <td class="sym-td">${stock.symbol}</td>
            <td><span class="sector-badge">${stock.sector}</span></td>
            <td class="right-align" style="font-weight: 600;">₹${formatNumber(stock.ltp)}</td>
            <td class="right-align ${returnClass}">${formatPercent(returnVal)}</td>
            <td class="right-align" style="color: var(--text-secondary);">₹${formatNumber(stock.valueCrores)} Cr</td>
            <td class="right-align" style="color: var(--text-secondary); font-size: 13px;">
                ${formatVolume(stock.volume)}
            </td>
            <td>
                <div class="w52-progress-container">
                    <span>${formatNumber(low, 0)}</span>
                    <div class="w52-bar-outer">
                        <div class="w52-bar-inner"></div>
                        <div class="w52-marker" style="left: ${progressPercent}%;"></div>
                    </div>
                    <span>${formatNumber(high, 0)}</span>
                </div>
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
}

// Update Return Distribution Summary UI
function updateDistributionList(data) {
    const key = getChangeKey();
    
    // Thresholds change based on timeframe
    let ranges;
    if (state.timeframe === '1D') {
        ranges = [
            { label: 'Gain > 2%', filter: v => v > 2, color: 'var(--gain-green)' },
            { label: 'Gain 0% to 2%', filter: v => v > 0 && v <= 2, color: 'rgba(16, 185, 129, 0.6)' },
            { label: 'Loss -2% to 0%', filter: v => v >= -2 && v <= 0, color: 'rgba(239, 68, 68, 0.6)' },
            { label: 'Loss < -2%', filter: v => v < -2, color: 'var(--loss-red)' }
        ];
    } else if (state.timeframe === '30D') {
        ranges = [
            { label: 'Gain > 10%', filter: v => v > 10, color: 'var(--gain-green)' },
            { label: 'Gain 0% to 10%', filter: v => v > 0 && v <= 10, color: 'rgba(16, 185, 129, 0.6)' },
            { label: 'Loss -10% to 0%', filter: v => v >= -10 && v <= 0, color: 'rgba(239, 68, 68, 0.6)' },
            { label: 'Loss < -10%', filter: v => v < -10, color: 'var(--loss-red)' }
        ];
    } else { // 365D
        ranges = [
            { label: 'Gain > 25%', filter: v => v > 25, color: 'var(--gain-green)' },
            { label: 'Gain 0% to 25%', filter: v => v > 0 && v <= 25, color: 'rgba(16, 185, 129, 0.6)' },
            { label: 'Loss -25% to 0%', filter: v => v >= -25 && v <= 0, color: 'rgba(239, 68, 68, 0.6)' },
            { label: 'Loss < -25%', filter: v => v < -25, color: 'var(--loss-red)' }
        ];
    }
    
    const container = document.getElementById('distribution-list');
    container.innerHTML = '';
    
    ranges.forEach(range => {
        const count = data.filter(stock => range.filter(stock[key])).length;
        const percent = data.length > 0 ? (count / data.length) * 100 : 0;
        
        const item = document.createElement('div');
        item.className = 'dist-bar-item';
        item.innerHTML = `
            <div class="dist-bar-label">${range.label}</div>
            <div class="dist-bar-track">
                <div class="dist-bar-fill" style="width: ${percent}%; background-color: ${range.color}"></div>
            </div>
            <div class="dist-bar-count">${count}</div>
        `;
        container.appendChild(item);
    });
}

// Update charts
function updateCharts(data) {
    const key = getChangeKey();
    
    // -------------------------------------
    // 1. Top Performers Chart (Bar Chart)
    // -------------------------------------
    const sorted = [...data].sort((a, b) => b[key] - a[key]);
    
    // Top 5 Gainers and Top 5 Losers
    const topGainers = sorted.slice(0, 5);
    const topLosers = sorted.slice(-5).reverse(); // reverse to put worst first
    
    const combinedData = [...topGainers, ...topLosers];
    const labels = combinedData.map(s => s.symbol);
    const values = combinedData.map(s => s[key]);
    
    // Background colors: green for gainers, red for losers
    const backgroundColors = combinedData.map(s => s[key] >= 0 ? 'rgba(16, 185, 129, 0.75)' : 'rgba(239, 68, 68, 0.75)');
    const borderColors = combinedData.map(s => s[key] >= 0 ? 'var(--gain-green)' : 'var(--loss-red)');

    if (rankingChart) {
        rankingChart.data.labels = labels;
        rankingChart.data.datasets[0].data = values;
        rankingChart.data.datasets[0].backgroundColor = backgroundColors;
        rankingChart.data.datasets[0].borderColor = borderColors;
        rankingChart.update();
    } else {
        const ctx = document.getElementById('rankingChart').getContext('2d');
        rankingChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '% Return',
                    data: values,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1.5,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Return: ${formatPercent(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#94a3b8',
                            font: { family: 'Outfit' },
                            callback: function(val) { return val + '%'; }
                        }
                    }
                }
            }
        });
    }

    // -------------------------------------
    // 2. Scatter Plot: 30D vs 365D Returns
    // -------------------------------------
    const scatterPoints = data.map(stock => ({
        x: stock.thirtyDayPercentChange,
        y: stock.threeSixtyFiveDayPercentChange,
        symbol: stock.symbol
    }));

    if (scatterChart) {
        scatterChart.data.datasets[0].data = scatterPoints;
        scatterChart.update();
    } else {
        const ctx2 = document.getElementById('scatterChart').getContext('2d');
        scatterChart = new Chart(ctx2, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Constituents',
                    data: scatterPoints,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: 'var(--accent-blue)',
                    borderWidth: 1,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const pt = context.raw;
                                return `${pt.symbol}: 30D = ${formatPercent(pt.x)}, 365D = ${formatPercent(pt.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: '30 Day % Return', color: '#94a3b8', font: { family: 'Outfit', weight: '600' } },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        title: { display: true, text: '365 Day % Return', color: '#94a3b8', font: { family: 'Outfit', weight: '600' } },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });
    }
}

// Master Dashboard Refresher
function updateDashboard() {
    const data = getFilteredData();
    updateStatsCards(data);
    updateTable();
    updateDistributionList(data);
    updateCharts(data);
}

// Show Modal with Stock Details
function showStockDetail(stock) {
    // Basic Details
    document.getElementById('modal-symbol').textContent = stock.symbol;
    document.getElementById('modal-sector').textContent = stock.sector;
    
    // Performance indicator
    const returnVal = stock.percentChange;
    const returnClass = returnVal >= 0 ? 'gain-text' : 'loss-text';
    
    document.getElementById('modal-ltp').textContent = `₹${formatNumber(stock.ltp)}`;
    const changeEl = document.getElementById('modal-change');
    changeEl.className = `modal-price-change ${returnClass}`;
    changeEl.innerHTML = `${returnVal >= 0 ? '▲' : '▼'} ${formatNumber(Math.abs(stock.change))} (${formatPercent(returnVal)})`;
    
    // Table Details
    document.getElementById('m-open').textContent = `₹${formatNumber(stock.open)}`;
    document.getElementById('m-high').textContent = `₹${formatNumber(stock.high)}`;
    document.getElementById('m-low').textContent = `₹${formatNumber(stock.low)}`;
    document.getElementById('m-close').textContent = `₹${formatNumber(stock.prevClose)}`;
    
    document.getElementById('m-volume').textContent = formatNumber(stock.volume, 0);
    document.getElementById('m-value').textContent = `₹${formatNumber(stock.valueCrores)} Cr`;
    
    document.getElementById('m-high52').textContent = `₹${formatNumber(stock.fiftyTwoWeekHigh)}`;
    document.getElementById('m-low52').textContent = `₹${formatNumber(stock.fiftyTwoWeekLow)}`;
    
    // Distances
    document.getElementById('m-dist-high').textContent = `${stock.distFrom52WHigh.toFixed(2)}% below High`;
    document.getElementById('m-dist-low').textContent = `${stock.distFrom52WLow.toFixed(2)}% above Low`;
    
    // Timeframes
    const d1 = document.getElementById('m-1d');
    d1.textContent = formatPercent(stock.percentChange);
    d1.className = `tf-val ${stock.percentChange >= 0 ? 'gain-text' : 'loss-text'}`;
    
    const d30 = document.getElementById('m-30d');
    d30.textContent = formatPercent(stock.thirtyDayPercentChange);
    d30.className = `tf-val ${stock.thirtyDayPercentChange >= 0 ? 'gain-text' : 'loss-text'}`;
    
    const d365 = document.getElementById('m-365d');
    d365.textContent = formatPercent(stock.threeSixtyFiveDayPercentChange);
    d365.className = `tf-val ${stock.threeSixtyFiveDayPercentChange >= 0 ? 'gain-text' : 'loss-text'}`;
    
    // Show Modal
    modalOverlay.classList.add('active');
}

// Close Modal Window
function closeModal() {
    modalOverlay.classList.remove('active');
}
