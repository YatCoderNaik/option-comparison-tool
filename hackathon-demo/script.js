// Smart Decision Maker - Option Comparison Tool
// Simple Hackathon Demo Implementation

class OptionManager {
    constructor() {
        this.options = [];
        this.container = document.getElementById('options-container');
        this.addButton = document.getElementById('add-option-btn');
        
        this.init();
    }
    
    init() {
        this.addButton.addEventListener('click', () => this.addOption());
        
        // Add initial options
        this.addOption('Option A', { cost: 100, quality: 8, speed: 7, support: 9 });
        this.addOption('Option B', { cost: 150, quality: 9, speed: 8, support: 7 });
        this.addOption('Option C', { cost: 80, quality: 6, speed: 9, support: 8 });
    }
    
    addOption(name = '', attributes = { cost: 100, quality: 5, speed: 5, support: 5 }) {
        const id = Date.now().toString();
        const option = {
            id,
            name: name || `Option ${String.fromCharCode(65 + this.options.length)}`,
            ...attributes
        };
        
        this.options.push(option);
        this.renderOption(option);
        this.notifyChange();
    }
    
    removeOption(id) {
        this.options = this.options.filter(option => option.id !== id);
        this.renderAll();
        this.notifyChange();
    }
    
    updateOption(id, field, value) {
        const option = this.options.find(opt => opt.id === id);
        if (option) {
            if (field === 'name') {
                option.name = value;
            } else {
                option[field] = parseFloat(value) || 0;
            }
            this.notifyChange();
        }
    }
    
    renderOption(option) {
        const optionElement = document.createElement('div');
        optionElement.className = 'option-item';
        optionElement.dataset.id = option.id;
        
        optionElement.innerHTML = `
            <div class="option-header">
                <input type="text" class="option-name" value="${option.name}" placeholder="Option name">
                <button class="remove-option" onclick="optionManager.removeOption('${option.id}')">Remove</button>
            </div>
            <div class="option-attributes">
                <div class="attribute-group">
                    <label class="attribute-label">Cost ($)</label>
                    <input type="number" class="attribute-input" data-field="cost" value="${option.cost}">
                </div>
                <div class="attribute-group">
                    <label class="attribute-label">Quality (1-10)</label>
                    <input type="number" class="attribute-input" data-field="quality" min="1" max="10" value="${option.quality}">
                </div>
                <div class="attribute-group">
                    <label class="attribute-label">Speed (1-10)</label>
                    <input type="number" class="attribute-input" data-field="speed" min="1" max="10" value="${option.speed}">
                </div>
                <div class="attribute-group">
                    <label class="attribute-label">Support (1-10)</label>
                    <input type="number" class="attribute-input" data-field="support" min="1" max="10" value="${option.support}">
                </div>
            </div>
        `;
        
        // Add event listeners
        const nameInput = optionElement.querySelector('.option-name');
        nameInput.addEventListener('input', (e) => {
            this.updateOption(option.id, 'name', e.target.value);
        });
        
        const attributeInputs = optionElement.querySelectorAll('.attribute-input');
        attributeInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                this.updateOption(option.id, e.target.dataset.field, e.target.value);
            });
        });
        
        this.container.appendChild(optionElement);
    }
    
    renderAll() {
        this.container.innerHTML = '';
        this.options.forEach(option => this.renderOption(option));
    }
    
    getOptions() {
        return this.options;
    }
    
    loadOptions(options) {
        this.options = options;
        this.renderAll();
        this.notifyChange();
    }
    
    notifyChange() {
        if (window.resultsDisplay) {
            window.resultsDisplay.update();
        }
    }
}

class CriteriaWeights {
    constructor() {
        this.weights = {
            cost: 25,
            quality: 30,
            speed: 25,
            support: 20
        };
        
        this.init();
    }
    
    init() {
        // Initialize sliders and displays
        Object.keys(this.weights).forEach(criterion => {
            const slider = document.getElementById(`${criterion}-weight`);
            const display = document.getElementById(`${criterion}-display`);
            
            slider.addEventListener('input', (e) => {
                this.updateWeight(criterion, parseInt(e.target.value));
            });
        });
        
        // Normalize button
        document.getElementById('normalize-btn').addEventListener('click', () => {
            this.normalizeWeights();
        });
        
        this.updateDisplays();
    }
    
    updateWeight(criterion, value) {
        this.weights[criterion] = value;
        this.updateDisplays();
        this.notifyChange();
    }
    
    normalizeWeights() {
        const total = this.getTotalWeight();
        if (total > 0) {
            Object.keys(this.weights).forEach(criterion => {
                this.weights[criterion] = Math.round((this.weights[criterion] / total) * 100);
            });
            
            // Adjust for rounding errors
            const newTotal = this.getTotalWeight();
            if (newTotal !== 100) {
                this.weights.support += (100 - newTotal);
            }
            
            this.updateSliders();
            this.updateDisplays();
            this.notifyChange();
        }
    }
    
    updateSliders() {
        Object.keys(this.weights).forEach(criterion => {
            const slider = document.getElementById(`${criterion}-weight`);
            slider.value = this.weights[criterion];
        });
    }
    
    updateDisplays() {
        Object.keys(this.weights).forEach(criterion => {
            const display = document.getElementById(`${criterion}-display`);
            display.textContent = `${this.weights[criterion]}%`;
        });
        
        const total = this.getTotalWeight();
        document.getElementById('total-weight').textContent = `${total}%`;
        
        const warning = document.getElementById('weight-warning');
        if (total !== 100) {
            warning.classList.remove('hidden');
        } else {
            warning.classList.add('hidden');
        }
    }
    
    getTotalWeight() {
        return Object.values(this.weights).reduce((sum, weight) => sum + weight, 0);
    }
    
    getWeights() {
        return { ...this.weights };
    }
    
    loadWeights(weights) {
        this.weights = { ...weights };
        this.updateSliders();
        this.updateDisplays();
        this.notifyChange();
    }
    
    notifyChange() {
        if (window.resultsDisplay) {
            window.resultsDisplay.update();
        }
    }
}

class ResultsDisplay {
    constructor() {
        this.container = document.getElementById('results-container');
        this.constraints = {
            maxCost: null,
            minQuality: null
        };
        
        this.initConstraints();
    }
    
    initConstraints() {
        const maxCostInput = document.getElementById('max-cost');
        const minQualityInput = document.getElementById('min-quality');
        
        maxCostInput.addEventListener('input', (e) => {
            this.constraints.maxCost = e.target.value ? parseFloat(e.target.value) : null;
            this.update();
        });
        
        minQualityInput.addEventListener('input', (e) => {
            this.constraints.minQuality = e.target.value ? parseFloat(e.target.value) : null;
            this.update();
        });
    }
    
    update() {
        const options = window.optionManager.getOptions();
        const weights = window.criteriaWeights.getWeights();
        
        if (options.length < 2) {
            this.showNoResults();
            return;
        }
        
        const { validOptions, eliminatedOptions } = this.applyConstraints(options);
        
        if (validOptions.length === 0) {
            this.showNoValidOptions(eliminatedOptions);
            return;
        }
        
        const results = this.calculateScores(validOptions, weights);
        this.displayResults(results);
        this.showDecisionGuidance(results, weights);
        this.showTradeoffAnalysis(results);
        
        if (eliminatedOptions.length > 0) {
            this.showEliminatedOptions(eliminatedOptions);
        }
    }
    
    applyConstraints(options) {
        const validOptions = [];
        const eliminatedOptions = [];
        
        options.forEach(option => {
            let isValid = true;
            let reasons = [];
            
            if (this.constraints.maxCost !== null && option.cost > this.constraints.maxCost) {
                isValid = false;
                reasons.push(`Cost $${option.cost} exceeds limit of $${this.constraints.maxCost}`);
            }
            
            if (this.constraints.minQuality !== null && option.quality < this.constraints.minQuality) {
                isValid = false;
                reasons.push(`Quality ${option.quality}/10 below minimum of ${this.constraints.minQuality}/10`);
            }
            
            if (isValid) {
                validOptions.push(option);
            } else {
                eliminatedOptions.push({ ...option, eliminationReasons: reasons });
            }
        });
        
        return { validOptions, eliminatedOptions };
    }
    
    calculateScores(options, weights) {
        // Find max cost for normalization (lower cost is better)
        const maxCost = Math.max(...options.map(opt => opt.cost));
        
        const results = options.map(option => {
            // Normalize cost (invert so lower cost = higher score)
            const normalizedCost = maxCost > 0 ? (maxCost - option.cost) / maxCost * 10 : 0;
            
            // Calculate weighted score
            const score = (
                (normalizedCost * weights.cost / 100) +
                (option.quality * weights.quality / 100) +
                (option.speed * weights.speed / 100) +
                (option.support * weights.support / 100)
            );
            
            // Calculate individual criterion scores for analysis
            const criterionScores = {
                cost: normalizedCost,
                quality: option.quality,
                speed: option.speed,
                support: option.support
            };
            
            return {
                ...option,
                score: score,
                criterionScores: criterionScores
            };
        });
        
        // Sort by score (highest first) and add ranks
        results.sort((a, b) => b.score - a.score);
        results.forEach((result, index) => {
            result.rank = index + 1;
        });
        
        return results;
    }
    
    displayResults(results) {
        const maxScore = results.length > 0 ? results[0].score : 10;
        
        this.container.innerHTML = results.map(result => {
            const progressWidth = (result.score / maxScore) * 100;
            const rankEmoji = this.getRankEmoji(result.rank);
            const prosAndCons = this.generateProsAndCons(result, results);
            
            return `
                <div class="result-item rank-${result.rank}">
                    <div class="result-header">
                        <div class="result-name">
                            <span class="result-rank">${rankEmoji}</span>
                            <span class="result-title">${result.name}</span>
                        </div>
                        <div class="result-score">
                            <div class="score-value">${result.score.toFixed(1)}</div>
                            <div class="score-label">score</div>
                        </div>
                    </div>
                    <div class="result-details">
                        <div>Cost: $${result.cost}</div>
                        <div>Quality: ${result.quality}/10</div>
                        <div>Speed: ${result.speed}/10</div>
                        <div>Support: ${result.support}/10</div>
                    </div>
                    <div class="result-progress">
                        <div class="progress-bar" style="width: ${progressWidth}%"></div>
                    </div>
                    <div class="pros-cons">
                        <div class="pros">
                            <div class="pros-title">✅ Strengths</div>
                            <ul>${prosAndCons.pros.map(pro => `<li>${pro}</li>`).join('')}</ul>
                        </div>
                        <div class="cons">
                            <div class="cons-title">⚠️ Weaknesses</div>
                            <ul>${prosAndCons.cons.map(con => `<li>${con}</li>`).join('')}</ul>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    generateProsAndCons(option, allResults) {
        const pros = [];
        const cons = [];
        
        // Find averages for comparison
        const avgCost = allResults.reduce((sum, r) => sum + r.cost, 0) / allResults.length;
        const avgQuality = allResults.reduce((sum, r) => sum + r.quality, 0) / allResults.length;
        const avgSpeed = allResults.reduce((sum, r) => sum + r.speed, 0) / allResults.length;
        const avgSupport = allResults.reduce((sum, r) => sum + r.support, 0) / allResults.length;
        
        // Cost analysis (lower is better)
        if (option.cost < avgCost * 0.8) {
            pros.push(`Very affordable at $${option.cost}`);
        } else if (option.cost > avgCost * 1.2) {
            cons.push(`Expensive at $${option.cost}`);
        }
        
        // Quality analysis
        if (option.quality >= 9) {
            pros.push(`Excellent quality (${option.quality}/10)`);
        } else if (option.quality < avgQuality * 0.8) {
            cons.push(`Below average quality (${option.quality}/10)`);
        }
        
        // Speed analysis
        if (option.speed >= 9) {
            pros.push(`Very fast performance (${option.speed}/10)`);
        } else if (option.speed < avgSpeed * 0.8) {
            cons.push(`Slower performance (${option.speed}/10)`);
        }
        
        // Support analysis
        if (option.support >= 9) {
            pros.push(`Outstanding support (${option.support}/10)`);
        } else if (option.support < avgSupport * 0.8) {
            cons.push(`Limited support (${option.support}/10)`);
        }
        
        // Ensure we have at least one pro and con
        if (pros.length === 0) {
            pros.push('Balanced across all criteria');
        }
        if (cons.length === 0) {
            cons.push('No significant weaknesses identified');
        }
        
        return { pros, cons };
    }
    
    showDecisionGuidance(results, weights) {
        const guidanceContainer = document.getElementById('decision-guidance');
        const guidanceContent = document.getElementById('guidance-content');
        
        if (results.length < 2) {
            guidanceContainer.classList.add('hidden');
            return;
        }
        
        const topOption = results[0];
        const secondOption = results[1];
        
        // Determine primary decision factors
        const topWeight = Math.max(...Object.values(weights));
        const primaryCriterion = Object.keys(weights).find(key => weights[key] === topWeight);
        
        let guidance = [];
        
        // Overall recommendation
        guidance.push({
            scenario: "Overall Best Choice",
            recommendation: `${topOption.name} scores highest (${topOption.score.toFixed(1)}) with your current priorities.`
        });
        
        // Budget-focused guidance
        const cheapestOption = results.reduce((min, option) => option.cost < min.cost ? option : min);
        if (cheapestOption.id !== topOption.id) {
            guidance.push({
                scenario: "If Budget is Critical",
                recommendation: `Consider ${cheapestOption.name} at $${cheapestOption.cost} - saves $${topOption.cost - cheapestOption.cost} vs top choice.`
            });
        }
        
        // Performance-focused guidance
        const fastestOption = results.reduce((max, option) => option.speed > max.speed ? option : max);
        if (fastestOption.id !== topOption.id) {
            guidance.push({
                scenario: "If Performance is Key",
                recommendation: `${fastestOption.name} offers the best speed (${fastestOption.speed}/10) for demanding workloads.`
            });
        }
        
        // Quality-focused guidance
        const highestQuality = results.reduce((max, option) => option.quality > max.quality ? option : max);
        if (highestQuality.id !== topOption.id) {
            guidance.push({
                scenario: "If Quality Matters Most",
                recommendation: `${highestQuality.name} provides the highest quality (${highestQuality.quality}/10) for critical applications.`
            });
        }
        
        guidanceContent.innerHTML = guidance.map(item => `
            <div class="guidance-item">
                <div class="guidance-scenario">${item.scenario}:</div>
                <div class="guidance-recommendation">${item.recommendation}</div>
            </div>
        `).join('');
        
        guidanceContainer.classList.remove('hidden');
    }
    
    showTradeoffAnalysis(results) {
        const tradeoffContainer = document.getElementById('tradeoff-analysis');
        const tradeoffContent = document.getElementById('tradeoff-content');
        
        if (results.length < 2) {
            tradeoffContainer.classList.add('hidden');
            return;
        }
        
        const tradeoffs = [];
        const topOption = results[0];
        
        // Compare top option with others
        for (let i = 1; i < Math.min(results.length, 3); i++) {
            const compareOption = results[i];
            const comparison = this.analyzeTradeoff(topOption, compareOption);
            if (comparison) {
                tradeoffs.push(comparison);
            }
        }
        
        tradeoffContent.innerHTML = tradeoffs.map(tradeoff => `
            <div class="tradeoff-item">
                <div class="tradeoff-comparison">${tradeoff.comparison}</div>
                <div class="tradeoff-explanation">${tradeoff.explanation}</div>
            </div>
        `).join('');
        
        tradeoffContainer.classList.remove('hidden');
    }
    
    analyzeTradeoff(optionA, optionB) {
        const differences = [];
        
        // Cost comparison
        const costDiff = optionA.cost - optionB.cost;
        if (Math.abs(costDiff) > 10) {
            if (costDiff > 0) {
                differences.push(`${optionA.name} costs $${costDiff} more`);
            } else {
                differences.push(`${optionA.name} costs $${Math.abs(costDiff)} less`);
            }
        }
        
        // Quality comparison
        const qualityDiff = optionA.quality - optionB.quality;
        if (Math.abs(qualityDiff) >= 1) {
            if (qualityDiff > 0) {
                differences.push(`${optionA.name} has ${qualityDiff} point${qualityDiff > 1 ? 's' : ''} higher quality`);
            } else {
                differences.push(`${optionB.name} has ${Math.abs(qualityDiff)} point${Math.abs(qualityDiff) > 1 ? 's' : ''} higher quality`);
            }
        }
        
        // Speed comparison
        const speedDiff = optionA.speed - optionB.speed;
        if (Math.abs(speedDiff) >= 1) {
            if (speedDiff > 0) {
                differences.push(`${optionA.name} is ${speedDiff} point${speedDiff > 1 ? 's' : ''} faster`);
            } else {
                differences.push(`${optionB.name} is ${Math.abs(speedDiff)} point${Math.abs(speedDiff) > 1 ? 's' : ''} faster`);
            }
        }
        
        // Support comparison
        const supportDiff = optionA.support - optionB.support;
        if (Math.abs(supportDiff) >= 1) {
            if (supportDiff > 0) {
                differences.push(`${optionA.name} has ${supportDiff} point${supportDiff > 1 ? 's' : ''} better support`);
            } else {
                differences.push(`${optionB.name} has ${Math.abs(supportDiff)} point${Math.abs(supportDiff) > 1 ? 's' : ''} better support`);
            }
        }
        
        if (differences.length === 0) return null;
        
        return {
            comparison: `${optionA.name} vs ${optionB.name}`,
            explanation: differences.join(', ') + '.'
        };
    }
    
    showEliminatedOptions(eliminatedOptions) {
        const existingEliminated = document.querySelector('.eliminated-options');
        if (existingEliminated) {
            existingEliminated.remove();
        }
        
        const eliminatedHtml = `
            <div class="eliminated-options">
                <div class="eliminated-title">🚫 Eliminated Options</div>
                ${eliminatedOptions.map(option => `
                    <div class="eliminated-item">
                        <strong>${option.name}</strong>: ${option.eliminationReasons.join(', ')}
                    </div>
                `).join('')}
            </div>
        `;
        
        this.container.insertAdjacentHTML('afterend', eliminatedHtml);
    }
    
    showNoResults() {
        this.container.innerHTML = `
            <div class="no-results">
                Add some options to see results!
            </div>
        `;
        document.getElementById('decision-guidance').classList.add('hidden');
        document.getElementById('tradeoff-analysis').classList.add('hidden');
    }
    
    showNoValidOptions(eliminatedOptions) {
        this.container.innerHTML = `
            <div class="no-results">
                No options meet your constraints. Try adjusting the filters above.
            </div>
        `;
        document.getElementById('decision-guidance').classList.add('hidden');
        document.getElementById('tradeoff-analysis').classList.add('hidden');
        this.showEliminatedOptions(eliminatedOptions);
    }
    
    getRankEmoji(rank) {
        switch (rank) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return '📍';
        }
    }
}

class QuickExamples {
    constructor() {
        this.examples = {
            cloud: {
                options: [
                    { id: '1', name: 'AWS', cost: 150, quality: 9, speed: 8, support: 9 },
                    { id: '2', name: 'Azure', cost: 140, quality: 8, speed: 8, support: 8 },
                    { id: '3', name: 'Google Cloud', cost: 135, quality: 8, speed: 9, support: 7 }
                ],
                weights: { cost: 30, quality: 25, speed: 25, support: 20 }
            },
            laptops: {
                options: [
                    { id: '1', name: 'MacBook Pro', cost: 2500, quality: 9, speed: 9, support: 8 },
                    { id: '2', name: 'ThinkPad X1', cost: 1800, quality: 8, speed: 8, support: 9 },
                    { id: '3', name: 'Surface Laptop', cost: 1500, quality: 7, speed: 7, support: 7 }
                ],
                weights: { cost: 35, quality: 30, speed: 20, support: 15 }
            },
            restaurants: {
                options: [
                    { id: '1', name: "Mario's Pizza", cost: 25, quality: 9, speed: 6, support: 8 },
                    { id: '2', name: 'Quick Slice', cost: 15, quality: 6, speed: 9, support: 6 },
                    { id: '3', name: 'Gourmet Pies', cost: 35, quality: 10, speed: 5, support: 9 }
                ],
                weights: { cost: 20, quality: 40, speed: 25, support: 15 }
            }
        };
        
        this.init();
    }
    
    init() {
        const exampleButtons = document.querySelectorAll('.example-btn');
        exampleButtons.forEach(button => {
            button.addEventListener('click', () => {
                const exampleId = button.dataset.example;
                this.loadExample(exampleId);
            });
        });
    }
    
    loadExample(exampleId) {
        const example = this.examples[exampleId];
        if (example) {
            window.optionManager.loadOptions(example.options);
            window.criteriaWeights.loadWeights(example.weights);
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Create global instances
    window.optionManager = new OptionManager();
    window.criteriaWeights = new CriteriaWeights();
    window.resultsDisplay = new ResultsDisplay();
    window.quickExamples = new QuickExamples();
    
    // Initial update
    window.resultsDisplay.update();
    
    console.log('Smart Decision Maker initialized successfully!');
});