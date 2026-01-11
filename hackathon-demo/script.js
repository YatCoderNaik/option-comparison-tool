// Smart Decision Maker - LLM Enhanced Option Comparison Tool
// Enhanced Hackathon Demo Implementation with AI Integration

class LLMIntegrationManager {
    constructor() {
        this.isLLMMode = false;
        this.currentQuery = '';
        this.generatedCriteria = null;
        this.suggestedOptions = null;
        
        this.init();
    }
    
    init() {
        console.log('Initializing LLMIntegrationManager...');
        
        // Query input and analysis
        const queryInput = document.getElementById('comparison-query');
        const analyzeBtn = document.getElementById('analyze-query');
        const configBtn = document.getElementById('config-btn');
        const manualModeBtn = document.getElementById('manual-mode-btn');
        
        console.log('Found elements:', { queryInput, analyzeBtn, configBtn, manualModeBtn });
        
        if (queryInput) {
            queryInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.analyzeQuery();
                }
            });
        }
        
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.analyzeQuery());
        }
        
        if (configBtn) {
            configBtn.addEventListener('click', () => {
                console.log('Config button clicked');
                this.showConfigModal();
            });
        }
        
        if (manualModeBtn) {
            manualModeBtn.addEventListener('click', () => this.switchToManualMode());
        }
        
        // Initialize query suggestions
        this.initQuerySuggestions();
        
        // Update provider status
        this.updateProviderStatus();
        
        // Initialize configuration modal
        this.initConfigModal();
        
        console.log('LLMIntegrationManager initialized successfully');
    }
    
    initQuerySuggestions() {
        const suggestionsContainer = document.getElementById('query-suggestions');
        const sampleQueries = window.config.getSampleQueries();
        
        suggestionsContainer.innerHTML = sampleQueries.slice(0, 4).map(query => 
            `<span class="suggestion-chip" data-query="${query}">${query}</span>`
        ).join('');
        
        // Add click handlers for suggestions
        suggestionsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggestion-chip')) {
                document.getElementById('comparison-query').value = e.target.dataset.query;
                this.analyzeQuery();
            }
        });
    }
    
    async analyzeQuery() {
        const queryInput = document.getElementById('comparison-query');
        const query = queryInput.value.trim();
        
        if (!query) {
            alert('Please enter a comparison question first.');
            return;
        }
        
        this.currentQuery = query;
        this.showLoadingState();
        
        try {
            // Step 1: Analyze the query
            console.log('Step 1: Starting query analysis...');
            const analysis = await window.llmService.analyzeQuery(query);
            console.log('Query analysis successful:', analysis);
            
            // Step 2: Generate criteria based on analysis
            console.log('Step 2: Starting criteria generation...');
            const criteriaResult = await window.llmService.generateCriteria(query, analysis.domain);
            this.generatedCriteria = criteriaResult;
            console.log('Generated criteria successful:', criteriaResult);
            
            // Step 3: Suggest options
            console.log('Step 3: Starting options suggestion...');
            const optionsResult = await window.llmService.suggestOptions(query, criteriaResult);
            this.suggestedOptions = optionsResult;
            console.log('Suggested options successful:', optionsResult);
            
            // Step 4: Update the interface
            console.log('Step 4: Updating interface...');
            this.updateInterfaceWithLLMResults();
            this.isLLMMode = true;
            this.updateProviderStatus();
            console.log('Analysis completed successfully!');
            
        } catch (error) {
            console.error('LLM analysis failed at step:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
            
            // Always hide loading states on error
            this.forceHideAllLoadingStates();
            
            this.showError(`Analysis failed: ${error.message}. Switching to manual mode.`);
            this.switchToManualMode();
        }
    }
    
    showLoadingState() {
        console.log('Showing loading states...');
        
        // Show loading in criteria panel
        const criteriaLoading = document.getElementById('criteria-loading');
        const weightControls = document.getElementById('weight-controls');
        if (criteriaLoading) criteriaLoading.classList.remove('hidden');
        if (weightControls) weightControls.style.display = 'none';
        
        // Show loading in options panel
        const optionsLoading = document.getElementById('options-loading');
        const optionsContainer = document.getElementById('options-container');
        if (optionsLoading) optionsLoading.classList.remove('hidden');
        if (optionsContainer) optionsContainer.style.display = 'none';
        
        // Update button state
        const analyzeBtn = document.getElementById('analyze-query');
        if (analyzeBtn) {
            const btnText = analyzeBtn.querySelector('.btn-text');
            const btnLoading = analyzeBtn.querySelector('.btn-loading');
            if (btnText) btnText.classList.add('hidden');
            if (btnLoading) btnLoading.classList.remove('hidden');
            analyzeBtn.disabled = true;
        }
        
        // Set a timeout fallback to hide loading states after 30 seconds
        setTimeout(() => {
            console.log('Loading timeout - forcing hide loading states');
            this.hideLoadingState();
        }, 30000);
    }
    
    hideLoadingState() {
        console.log('Hiding loading states...');
        
        // Hide loading states with error handling
        const criteriaLoading = document.getElementById('criteria-loading');
        const optionsLoading = document.getElementById('options-loading');
        
        if (criteriaLoading) {
            criteriaLoading.classList.add('hidden');
            criteriaLoading.style.display = 'none';
        }
        if (optionsLoading) {
            optionsLoading.classList.add('hidden');
            optionsLoading.style.display = 'none';
        }
        
        // Show content
        const weightControls = document.getElementById('weight-controls');
        const optionsContainer = document.getElementById('options-container');
        
        if (weightControls) {
            weightControls.style.display = 'block';
        }
        if (optionsContainer) {
            optionsContainer.style.display = 'block';
        }
        
        // Reset button state
        const analyzeBtn = document.getElementById('analyze-query');
        if (analyzeBtn) {
            const btnText = analyzeBtn.querySelector('.btn-text');
            const btnLoading = analyzeBtn.querySelector('.btn-loading');
            
            if (btnText) {
                btnText.classList.remove('hidden');
                btnText.style.display = 'inline';
            }
            if (btnLoading) {
                btnLoading.classList.add('hidden');
                btnLoading.style.display = 'none';
            }
            
            analyzeBtn.disabled = false;
        }
        
        console.log('Loading states hidden successfully');
    }
    
    updateInterfaceWithLLMResults() {
        console.log('Updating interface with LLM results...');
        
        // Force hide loading states first
        this.hideLoadingState();
        
        // Update criteria
        if (this.generatedCriteria) {
            this.updateCriteriaInterface();
        }
        
        // Update options
        if (this.suggestedOptions) {
            this.updateOptionsInterface();
        }
        
        // Show regenerate buttons
        document.getElementById('regenerate-criteria').classList.remove('hidden');
        document.getElementById('use-suggestions').classList.remove('hidden');
        
        // Force hide any remaining loading states after a short delay
        setTimeout(() => {
            console.log('Final cleanup of loading states...');
            this.forceHideAllLoadingStates();
        }, 500);
    }
    
    forceHideAllLoadingStates() {
        console.log('Force hiding all loading states...');
        
        // Hide all loading elements
        const loadingElements = [
            'criteria-loading',
            'options-loading'
        ];
        
        loadingElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.add('hidden');
                element.style.display = 'none';
            }
        });
        
        // Show all content elements
        const contentElements = [
            'weight-controls',
            'options-container'
        ];
        
        contentElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'block';
            }
        });
        
        // Reset analyze button
        const analyzeBtn = document.getElementById('analyze-query');
        if (analyzeBtn) {
            const btnText = analyzeBtn.querySelector('.btn-text');
            const btnLoading = analyzeBtn.querySelector('.btn-loading');
            
            if (btnText) {
                btnText.classList.remove('hidden');
                btnText.style.display = 'inline';
            }
            if (btnLoading) {
                btnLoading.classList.add('hidden');
                btnLoading.style.display = 'none';
            }
            
            analyzeBtn.disabled = false;
        }
        
        console.log('All loading states force hidden');
    }
    
    updateCriteriaInterface() {
        const { criteria, reasoning } = this.generatedCriteria;
        
        // Show explanation
        const explanationContainer = document.getElementById('criteria-explanation');
        const explanationText = explanationContainer.querySelector('.explanation-text');
        explanationText.textContent = reasoning;
        explanationContainer.classList.remove('hidden');
        
        // Update criteria weights manager
        if (window.criteriaWeights) {
            window.criteriaWeights.updateFromLLM(criteria);
        }
    }
    
    updateOptionsInterface() {
        const { options } = this.suggestedOptions;
        
        // Clear existing options when showing LLM suggestions
        if (window.optionManager && window.optionManager.options.length > 0) {
            console.log('Clearing existing options for LLM suggestions');
            window.optionManager.options = [];
            window.optionManager.renderAll();
        }
        
        // Show suggested options
        const suggestedContainer = document.getElementById('suggested-options');
        const suggestionsList = document.getElementById('suggestions-list');
        
        suggestionsList.innerHTML = options.map(option => `
            <div class="suggestion-item" data-option-id="${option.id}">
                <div class="suggestion-header">
                    <div class="suggestion-name">${option.name}</div>
                    <div class="suggestion-actions">
                        <button class="btn btn-primary btn-small accept-suggestion">Accept</button>
                        <button class="btn btn-secondary btn-small customize-suggestion">Customize</button>
                    </div>
                </div>
                <div class="suggestion-description">${option.description}</div>
                <div class="suggestion-attributes">
                    ${Object.entries(option.attributes).map(([key, attr]) => `
                        <div class="suggestion-attribute">
                            <span class="attribute-name">${key}</span>
                            <span class="attribute-value">${attr.value}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
        
        // Add event listeners for suggestion actions
        suggestionsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('accept-suggestion')) {
                const optionId = e.target.closest('.suggestion-item').dataset.optionId;
                this.acceptSuggestion(optionId);
            } else if (e.target.classList.contains('customize-suggestion')) {
                const optionId = e.target.closest('.suggestion-item').dataset.optionId;
                this.customizeSuggestion(optionId);
            }
        });
        
        // Add handlers for bulk actions
        document.getElementById('accept-all-suggestions').onclick = () => this.acceptAllSuggestions();
        document.getElementById('clear-suggestions').onclick = () => this.clearSuggestions();
        
        suggestedContainer.classList.remove('hidden');
    }
    
    acceptSuggestion(optionId) {
        console.log('Accepting suggestion:', optionId);
        console.log('Current suggestedOptions:', this.suggestedOptions);
        console.log('Available optionManager:', window.optionManager);
        
        // Check if we have suggested options
        if (!this.suggestedOptions || !this.suggestedOptions.options) {
            console.error('No suggested options available');
            alert('No suggestions available. Please run an analysis first.');
            return;
        }
        
        // Check if optionManager is available
        if (!window.optionManager) {
            console.error('OptionManager not available');
            
            // Try to create a minimal fallback
            try {
                console.log('Creating emergency fallback OptionManager...');
                window.optionManager = {
                    options: [],
                    addOption: function(name, attributes) {
                        console.log('Emergency addOption called:', name, attributes);
                        const option = {
                            id: Date.now().toString(),
                            name: name || 'New Option',
                            ...attributes
                        };
                        this.options.push(option);
                        
                        // Invalidate analysis cache when options change
                        if (window.resultsDisplay && window.resultsDisplay.invalidateAnalysisCache) {
                            window.resultsDisplay.invalidateAnalysisCache();
                        }
                        
                        // Try to add to DOM manually using proper structure
                        const container = document.getElementById('options-container');
                        if (container) {
                            const optionDiv = document.createElement('div');
                            optionDiv.className = 'option-item';
                            optionDiv.dataset.id = option.id;
                            
                            // Get current criteria configuration for proper rendering
                            let criteriaKeys = ['cost', 'quality', 'speed', 'support']; // fallback
                            let criteriaConfig = {
                                cost: { name: 'Cost', unit: '($)' },
                                quality: { name: 'Quality', unit: '/10' },
                                speed: { name: 'Speed', unit: '/10' },
                                support: { name: 'Support', unit: '/10' }
                            };
                            
                            if (window.criteriaWeights && window.criteriaWeights.criteriaConfig) {
                                criteriaKeys = Object.keys(window.criteriaWeights.weights);
                                criteriaConfig = window.criteriaWeights.criteriaConfig;
                            }
                            
                            // Generate attribute inputs based on current criteria
                            const attributeInputs = criteriaKeys.map(key => {
                                const config = criteriaConfig[key];
                                const value = attributes[key] || option[key] || (key === 'cost' ? 100 : 5);
                                
                                let inputAttrs = '';
                                if (config.unit === '/10') {
                                    inputAttrs = 'min="1" max="10"';
                                } else if (key === 'cost') {
                                    inputAttrs = 'min="0"';
                                }
                                
                                return `
                                    <div class="attribute-group">
                                        <label class="attribute-label">${config.name} ${config.unit}</label>
                                        <input type="number" class="attribute-input" data-field="${key}" 
                                               value="${value}" ${inputAttrs}>
                                    </div>
                                `;
                            }).join('');
                            
                            optionDiv.innerHTML = `
                                <div class="option-header">
                                    <input type="text" class="option-name" value="${option.name}" placeholder="Option name">
                                    <button class="remove-option" onclick="this.parentElement.parentElement.remove(); if(window.resultsDisplay) window.resultsDisplay.update().catch(console.error);">Remove</button>
                                </div>
                                <div class="option-attributes">
                                    ${attributeInputs}
                                </div>
                            `;
                            
                            // Add event listeners for the new option
                            const nameInput = optionDiv.querySelector('.option-name');
                            nameInput.addEventListener('input', (e) => {
                                option.name = e.target.value;
                                if (window.resultsDisplay) window.resultsDisplay.update().catch(console.error);
                            });
                            
                            const attributeInputElements = optionDiv.querySelectorAll('.attribute-input');
                            attributeInputElements.forEach(input => {
                                input.addEventListener('input', (e) => {
                                    const field = e.target.dataset.field;
                                    const value = parseFloat(e.target.value) || 0;
                                    option[field] = value;
                                    if (window.resultsDisplay) window.resultsDisplay.update().catch(console.error);
                                });
                            });
                            
                            container.appendChild(optionDiv);
                            console.log('Option added to DOM via emergency fallback');
                        }
                        
                        // Trigger results update
                        if (window.resultsDisplay && typeof window.resultsDisplay.update === 'function') {
                            window.resultsDisplay.update().catch(console.error);
                        }
                        
                        console.log('Option added via emergency fallback');
                        return option;
                    },
                    getOptions: function() { return this.options; },
                    removeOption: function(id) {
                        this.options = this.options.filter(opt => opt.id !== id);
                        
                        // Invalidate analysis cache when options change
                        if (window.resultsDisplay && window.resultsDisplay.invalidateAnalysisCache) {
                            window.resultsDisplay.invalidateAnalysisCache();
                        }
                        
                        if (window.resultsDisplay) window.resultsDisplay.update().catch(console.error);
                    },
                    loadOptions: function(options) {
                        this.options = options || [];
                        
                        // Invalidate analysis cache when options change
                        if (window.resultsDisplay && window.resultsDisplay.invalidateAnalysisCache) {
                            window.resultsDisplay.invalidateAnalysisCache();
                        }
                        
                        if (window.resultsDisplay) window.resultsDisplay.update().catch(console.error);
                    },
                    renderAll: function() {
                        console.log('Emergency fallback renderAll called');
                        const container = document.getElementById('options-container');
                        if (container) {
                            container.innerHTML = '';
                            this.options.forEach(option => {
                                this.addOption(option.name, option);
                            });
                        }
                    },
                    notifyChange: function() {
                        if (window.resultsDisplay && typeof window.resultsDisplay.update === 'function') {
                            window.resultsDisplay.update().catch(console.error);
                        }
                    }
                };
                console.log('Emergency fallback OptionManager created');
            } catch (fallbackError) {
                console.error('Emergency fallback failed:', fallbackError);
                alert('Option manager not initialized. Please refresh the page.');
                return;
            }
        }
        
        // Find the specific option
        const option = this.suggestedOptions.options.find(opt => opt.id === optionId);
        if (!option) {
            console.error('Option not found:', optionId);
            console.log('Available options:', this.suggestedOptions.options.map(opt => opt.id));
            alert('Suggestion not found. Please try again.');
            return;
        }
        
        try {
            // Convert LLM attributes to option manager format
            const attributes = {};
            Object.entries(option.attributes).forEach(([key, attr]) => {
                attributes[key] = attr.value;
            });
            
            console.log('Adding option to manager:', option.name, attributes);
            window.optionManager.addOption(option.name, attributes);
            
            // Remove from suggestions with visual feedback
            const suggestionItem = document.querySelector(`[data-option-id="${optionId}"]`);
            if (suggestionItem) {
                suggestionItem.style.opacity = '0.5';
                suggestionItem.style.transition = 'opacity 0.3s';
                setTimeout(() => {
                    suggestionItem.remove();
                    // Check if all suggestions are gone
                    const remainingSuggestions = document.querySelectorAll('.suggestion-item');
                    if (remainingSuggestions.length === 0) {
                        this.clearSuggestions();
                    }
                }, 300);
            }
            
            console.log('Suggestion accepted successfully');
        } catch (error) {
            console.error('Error accepting suggestion:', error);
            alert('Failed to accept suggestion: ' + error.message);
        }
    }
    
    customizeSuggestion(optionId) {
        // Accept the suggestion first, then user can modify it
        this.acceptSuggestion(optionId);
    }
    
    acceptAllSuggestions() {
        console.log('Accepting all suggestions');
        if (this.suggestedOptions && this.suggestedOptions.options.length > 0) {
            try {
                // Show progress feedback
                const acceptAllBtn = document.getElementById('accept-all-suggestions');
                if (acceptAllBtn) {
                    acceptAllBtn.disabled = true;
                    acceptAllBtn.textContent = 'Adding...';
                }
                
                // Add all options
                let addedCount = 0;
                this.suggestedOptions.options.forEach(option => {
                    try {
                        const attributes = {};
                        Object.entries(option.attributes).forEach(([key, attr]) => {
                            attributes[key] = attr.value;
                        });
                        
                        window.optionManager.addOption(option.name, attributes);
                        addedCount++;
                        console.log('Added option:', option.name);
                    } catch (error) {
                        console.error('Error adding option:', option.name, error);
                    }
                });
                
                // Clear suggestions after successful addition
                setTimeout(() => {
                    this.clearSuggestions();
                    console.log(`Successfully added ${addedCount} options`);
                    
                    // Reset button
                    if (acceptAllBtn) {
                        acceptAllBtn.disabled = false;
                        acceptAllBtn.textContent = 'Accept All';
                    }
                    
                    // Show success message
                    if (addedCount > 0) {
                        // Could add a toast notification here
                        console.log('All suggestions accepted successfully');
                    }
                }, 500);
                
            } catch (error) {
                console.error('Error in acceptAllSuggestions:', error);
                alert('Failed to accept all suggestions. Please try again.');
                
                // Reset button on error
                const acceptAllBtn = document.getElementById('accept-all-suggestions');
                if (acceptAllBtn) {
                    acceptAllBtn.disabled = false;
                    acceptAllBtn.textContent = 'Accept All';
                }
            }
        } else {
            console.warn('No suggestions to accept');
            this.clearSuggestions();
        }
    }
    
    clearSuggestions() {
        document.getElementById('suggested-options').classList.add('hidden');
    }
    
    switchToManualMode() {
        console.log('Switching to manual mode...');
        this.isLLMMode = false;
        
        // Force hide all loading states
        this.forceHideAllLoadingStates();
        
        // Hide LLM-specific elements
        document.getElementById('criteria-explanation').classList.add('hidden');
        document.getElementById('suggested-options').classList.add('hidden');
        document.getElementById('regenerate-criteria').classList.add('hidden');
        document.getElementById('use-suggestions').classList.add('hidden');
        
        // Reset to default criteria if needed
        if (window.criteriaWeights) {
            window.criteriaWeights.resetToDefault();
        }
        
        this.updateProviderStatus();
        console.log('Manual mode activated');
    }
    
    updateProviderStatus() {
        const indicator = document.getElementById('provider-indicator');
        const stats = window.config.getStats();
        
        if (this.isLLMMode && stats.isEnabled) {
            indicator.textContent = `AI Active`;
            indicator.className = 'status-indicator llm';
        } else if (stats.isEnabled) {
            indicator.textContent = `AI Ready`;
            indicator.className = 'status-indicator llm';
        } else {
            indicator.textContent = 'Demo Mode';
            indicator.className = 'status-indicator demo';
        }
    }
    
    showError(message) {
        // Simple error display - could be enhanced with a proper notification system
        alert(message);
    }
    
    // Configuration Modal Methods
    initConfigModal() {
        console.log('Initializing config modal...');
        const modal = document.getElementById('config-modal');
        const overlay = document.getElementById('modal-overlay');
        const closeBtn = document.getElementById('close-modal');
        const saveBtn = document.getElementById('save-config');
        const clearCacheBtn = document.getElementById('clear-cache');
        
        console.log('Modal elements:', { modal, overlay, closeBtn, saveBtn, clearCacheBtn });
        
        // Close modal handlers
        if (overlay) {
            overlay.addEventListener('click', () => {
                console.log('Overlay clicked');
                this.hideConfigModal();
            });
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                console.log('Close button clicked');
                this.hideConfigModal();
            });
        }
        
        // Save configuration
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                console.log('Save button clicked');
                this.saveConfiguration();
            });
        }
        
        // Clear cache
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => {
                console.log('Clear cache button clicked');
                window.config.clearCache();
                this.updateConfigStats();
                alert('Cache cleared successfully!');
            });
        }
        
        // Provider selection
        const providerSelect = document.getElementById('provider-select');
        if (providerSelect) {
            providerSelect.addEventListener('change', () => {
                console.log('Provider changed');
                this.updateApiKeyVisibility();
            });
        }
    }
    
    showConfigModal() {
        console.log('Showing config modal...');
        const modal = document.getElementById('config-modal');
        
        if (!modal) {
            console.error('Config modal not found!');
            return;
        }
        
        // Update form with current settings
        const providerSelect = document.getElementById('provider-select');
        const apiKeyInput = document.getElementById('api-key-input');
        const endpointInput = document.getElementById('endpoint-input');
        const modelInput = document.getElementById('model-input');
        
        if (providerSelect) {
            providerSelect.value = window.config.settings.llm.provider;
        }
        if (apiKeyInput) {
            apiKeyInput.value = window.config.getApiKey();
        }
        if (endpointInput) {
            endpointInput.value = window.config.getEndpoint();
        }
        if (modelInput) {
            modelInput.value = window.config.getModel();
        }
        
        this.updateApiKeyVisibility();
        this.updateConfigStats();
        
        modal.classList.remove('hidden');
        console.log('Modal should be visible now');
    }
    
    hideConfigModal() {
        console.log('Hiding config modal...');
        const modal = document.getElementById('config-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    updateApiKeyVisibility() {
        console.log('Updating API key visibility...');
        const provider = document.getElementById('provider-select')?.value;
        const apiKeySection = document.getElementById('api-key-section');
        const endpointSection = document.getElementById('endpoint-section');
        const modelSection = document.getElementById('model-section');
        const providerConfig = window.config.providers[provider];
        
        console.log('Provider config:', { provider, providerConfig });
        
        // Always show API key section, but update placeholder and help text
        if (apiKeySection) {
            apiKeySection.style.display = 'block';
            const apiKeyInput = document.getElementById('api-key-input');
            const helpText = apiKeySection.querySelector('.config-help');
            
            if (providerConfig && providerConfig.requiresKey) {
                // Required for cloud providers
                apiKeyInput.placeholder = 'Enter your API key (required)';
                helpText.textContent = 'Your API key is stored locally and never sent to our servers.';
            } else {
                // Optional for local providers
                apiKeyInput.placeholder = 'Enter your API key (optional for local models)';
                helpText.textContent = 'Optional: Some local setups may require an API key. Leave blank if not needed.';
            }
        }
        
        // Show/hide endpoint section
        if (endpointSection) {
            if (providerConfig && providerConfig.requiresEndpoint) {
                endpointSection.style.display = 'block';
                // Set default endpoint for the provider
                const endpointInput = document.getElementById('endpoint-input');
                if (endpointInput && !endpointInput.value && providerConfig.endpoint) {
                    endpointInput.value = providerConfig.endpoint;
                }
            } else {
                endpointSection.style.display = 'none';
            }
        }
        
        // Show/hide model section
        if (modelSection) {
            if (provider === 'demo') {
                modelSection.style.display = 'none';
            } else {
                modelSection.style.display = 'block';
                // Set default model for the provider
                const modelInput = document.getElementById('model-input');
                if (modelInput && !modelInput.value && providerConfig.model) {
                    modelInput.value = providerConfig.model;
                }
            }
        }
    }
    
    saveConfiguration() {
        console.log('Saving configuration...');
        const provider = document.getElementById('provider-select')?.value;
        const apiKey = document.getElementById('api-key-input')?.value;
        const endpoint = document.getElementById('endpoint-input')?.value;
        const model = document.getElementById('model-input')?.value;
        
        console.log('Config values:', { provider, apiKey: apiKey ? 'SET' : 'EMPTY', endpoint, model });
        
        if (provider) {
            window.config.setProvider(provider);
        }
        if (apiKey) {
            window.config.setApiKey(apiKey);
        }
        if (endpoint) {
            window.config.setEndpoint(endpoint);
        }
        if (model) {
            window.config.setModel(model);
        }
        
        this.updateProviderStatus();
        this.hideConfigModal();
        
        alert('Configuration saved successfully!');
    }
    
    updateConfigStats() {
        const stats = window.config.getStats();
        const statsContainer = document.getElementById('config-stats');
        
        statsContainer.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Current Provider:</span>
                <span class="stat-value">${stats.provider}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Model:</span>
                <span class="stat-value">${stats.model}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">API Key:</span>
                <span class="stat-value">${stats.hasApiKey ? 'Configured' : 'Not Set'}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Endpoint:</span>
                <span class="stat-value">${stats.hasEndpoint ? 'Configured' : 'Default'}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Cache Size:</span>
                <span class="stat-value">${stats.cacheSize} entries</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Status:</span>
                <span class="stat-value">${stats.isEnabled ? 'Ready' : 'Demo Mode'}</span>
            </div>
        `;
    }
}

class OptionManager {
    constructor() {
        console.log('OptionManager constructor called');
        this.options = [];
        
        // Get DOM elements with error handling
        this.container = document.getElementById('options-container');
        this.addButton = document.getElementById('add-option-btn');
        
        if (!this.container) {
            console.error('options-container element not found');
            throw new Error('Required DOM element options-container not found');
        }
        
        if (!this.addButton) {
            console.error('add-option-btn element not found');
            throw new Error('Required DOM element add-option-btn not found');
        }
        
        console.log('OptionManager DOM elements found, calling init...');
        this.init();
    }
    
    init() {
        try {
            console.log('OptionManager init called');
            
            // Add event listener with error handling
            if (this.addButton) {
                this.addButton.addEventListener('click', () => this.addOption());
                console.log('Add button event listener attached');
            }
            
            // Don't add any initial options - start with empty state
            console.log('OptionManager initialized without default options');
            
        } catch (error) {
            console.error('Error in OptionManager.init():', error);
            throw error;
        }
    }
    
    addOption(name = '', attributes = null) {
        console.log('OptionManager.addOption called:', { name, attributes });
        
        const id = Date.now().toString();
        
        // Use provided attributes or generate defaults based on current criteria
        let optionAttributes;
        if (attributes) {
            optionAttributes = { ...attributes };
            console.log('Using provided attributes:', optionAttributes);
        } else {
            // Generate default attributes based on current criteria
            optionAttributes = {};
            
            try {
                if (window.criteriaWeights && window.criteriaWeights.weights) {
                    const criteriaKeys = Object.keys(window.criteriaWeights.weights);
                    criteriaKeys.forEach(key => {
                        if (key === 'cost') {
                            optionAttributes[key] = 100;
                        } else {
                            optionAttributes[key] = 5;
                        }
                    });
                    console.log('Generated default attributes from criteria:', optionAttributes);
                } else {
                    // Fallback to basic attributes if criteriaWeights not available
                    optionAttributes = {
                        cost: 100,
                        quality: 5,
                        speed: 5,
                        support: 5
                    };
                    console.log('Using fallback default attributes:', optionAttributes);
                }
            } catch (error) {
                console.error('Error generating default attributes:', error);
                // Use basic fallback
                optionAttributes = {
                    cost: 100,
                    quality: 5,
                    speed: 5,
                    support: 5
                };
            }
        }
        
        const option = {
            id,
            name: name || `Option ${String.fromCharCode(65 + this.options.length)}`,
            ...optionAttributes
        };
        
        console.log('Creating option:', option);
        
        try {
            this.options.push(option);
            this.renderOption(option);
            
            // Invalidate analysis cache when options change
            if (window.resultsDisplay && window.resultsDisplay.invalidateAnalysisCache) {
                window.resultsDisplay.invalidateAnalysisCache();
            }
            
            this.notifyChange();
            console.log('Option added successfully');
        } catch (error) {
            console.error('Error adding option:', error);
            throw error;
        }
    }
    
    removeOption(id) {
        this.options = this.options.filter(option => option.id !== id);
        this.renderAll();
        
        // Invalidate analysis cache when options change
        if (window.resultsDisplay && window.resultsDisplay.invalidateAnalysisCache) {
            window.resultsDisplay.invalidateAnalysisCache();
        }
        
        this.notifyChange();
    }
    
    updateOption(id, field, value) {
        const option = this.options.find(opt => opt.id === id);
        if (option) {
            if (field === 'name') {
                option.name = value;
                // Name changes affect analysis, invalidate cache
                if (window.resultsDisplay && window.resultsDisplay.invalidateAnalysisCache) {
                    window.resultsDisplay.invalidateAnalysisCache();
                }
            } else {
                option[field] = parseFloat(value) || 0;
                // Value changes affect analysis, invalidate cache
                if (window.resultsDisplay && window.resultsDisplay.invalidateAnalysisCache) {
                    window.resultsDisplay.invalidateAnalysisCache();
                }
            }
            this.notifyChange();
        }
    }
    
    renderOption(option) {
        const optionElement = document.createElement('div');
        optionElement.className = 'option-item';
        optionElement.dataset.id = option.id;
        
        // Get current criteria configuration with fallback
        let criteriaConfig, criteriaKeys;
        
        try {
            if (window.criteriaWeights && window.criteriaWeights.criteriaConfig && window.criteriaWeights.weights) {
                criteriaConfig = window.criteriaWeights.criteriaConfig;
                criteriaKeys = Object.keys(window.criteriaWeights.weights);
            } else {
                // Fallback configuration
                criteriaConfig = {
                    cost: { name: 'Cost', unit: '($)' },
                    quality: { name: 'Quality', unit: '/10' },
                    speed: { name: 'Speed', unit: '/10' },
                    support: { name: 'Support', unit: '/10' }
                };
                criteriaKeys = ['cost', 'quality', 'speed', 'support'];
            }
        } catch (error) {
            console.error('Error getting criteria configuration:', error);
            // Use basic fallback
            criteriaConfig = {
                cost: { name: 'Cost', unit: '($)' },
                quality: { name: 'Quality', unit: '/10' },
                speed: { name: 'Speed', unit: '/10' },
                support: { name: 'Support', unit: '/10' }
            };
            criteriaKeys = ['cost', 'quality', 'speed', 'support'];
        }
        
        // Generate attribute inputs based on current criteria
        const attributeInputs = criteriaKeys.map(key => {
            const config = criteriaConfig[key];
            const value = option[key] || (key === 'cost' ? 100 : 5);
            
            let inputType = 'number';
            let inputAttrs = '';
            
            if (config.unit === '/10') {
                inputAttrs = 'min="1" max="10"';
            } else if (key === 'cost') {
                inputAttrs = 'min="0"';
            }
            
            return `
                <div class="attribute-group">
                    <label class="attribute-label">${config.name} ${config.unit}</label>
                    <input type="${inputType}" class="attribute-input" data-field="${key}" 
                           value="${value}" ${inputAttrs}>
                </div>
            `;
        }).join('');
        
        optionElement.innerHTML = `
            <div class="option-header">
                <input type="text" class="option-name" value="${option.name}" placeholder="Option name">
                <button class="remove-option" onclick="window.optionManager.removeOption('${option.id}')">Remove</button>
            </div>
            <div class="option-attributes">
                ${attributeInputs}
            </div>
        `;
        
        // Add event listeners
        const nameInput = optionElement.querySelector('.option-name');
        nameInput.addEventListener('input', (e) => {
            this.updateOption(option.id, 'name', e.target.value);
        });
        
        const attributeInputElements = optionElement.querySelectorAll('.attribute-input');
        attributeInputElements.forEach(input => {
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
        
        // Invalidate analysis cache when options change
        if (window.resultsDisplay && window.resultsDisplay.invalidateAnalysisCache) {
            window.resultsDisplay.invalidateAnalysisCache();
        }
        
        this.notifyChange();
    }
    
    notifyChange() {
        try {
            if (window.resultsDisplay && typeof window.resultsDisplay.update === 'function') {
                window.resultsDisplay.update().catch(console.error);
            } else {
                console.warn('ResultsDisplay not available for OptionManager.notifyChange');
            }
        } catch (error) {
            console.error('Error in OptionManager.notifyChange:', error);
        }
    }
}

class CriteriaWeights {
    constructor() {
        this.defaultWeights = {
            cost: 25,
            quality: 30,
            speed: 25,
            support: 20
        };
        
        this.weights = { ...this.defaultWeights };
        this.criteriaConfig = {
            cost: { name: 'Cost', description: 'Lower is better', direction: 'minimize', unit: '($)' },
            quality: { name: 'Quality', description: 'Overall quality rating', direction: 'maximize', unit: '/10' },
            speed: { name: 'Speed', description: 'Performance and speed', direction: 'maximize', unit: '/10' },
            support: { name: 'Support', description: 'Customer support quality', direction: 'maximize', unit: '/10' }
        };
        
        this.init();
    }
    
    init() {
        this.renderCriteria();
        
        // Normalize button
        document.getElementById('normalize-btn').addEventListener('click', () => {
            this.normalizeWeights();
        });
        
        // Regenerate criteria button
        document.getElementById('regenerate-criteria').addEventListener('click', () => {
            this.regenerateCriteria();
        });
        
        this.updateDisplays();
    }
    
    renderCriteria() {
        const container = document.getElementById('weight-controls');
        
        container.innerHTML = Object.keys(this.weights).map(criterion => {
            const config = this.criteriaConfig[criterion];
            const directionText = config.direction === 'minimize' ? ' (lower is better)' : '';
            
            return `
                <div class="weight-item">
                    <div class="weight-header">
                        <label for="${criterion}-weight">${config.name}${directionText}</label>
                        <span id="${criterion}-display" class="weight-value">${this.weights[criterion]}%</span>
                    </div>
                    <input type="range" id="${criterion}-weight" class="weight-slider" 
                           min="0" max="100" value="${this.weights[criterion]}">
                </div>
            `;
        }).join('');
        
        // Add event listeners to new sliders
        Object.keys(this.weights).forEach(criterion => {
            const slider = document.getElementById(`${criterion}-weight`);
            slider.addEventListener('input', (e) => {
                this.updateWeight(criterion, parseInt(e.target.value));
            });
        });
        
        // Remove existing weight summary and button to prevent duplicates
        const existingSummary = document.querySelector('.weight-summary');
        const existingButton = document.getElementById('normalize-btn');
        if (existingSummary) existingSummary.remove();
        if (existingButton) existingButton.remove();
        
        // Add weight summary
        container.insertAdjacentHTML('afterend', `
            <div class="weight-summary">
                <div class="total-weight">
                    Total Weight: <span id="total-weight">100%</span>
                </div>
                <div id="weight-warning" class="weight-warning hidden">
                    ⚠️ Weights should total 100%
                </div>
            </div>
            <button id="normalize-btn" class="btn btn-secondary">
                Auto-Balance Weights
            </button>
        `);
        
        // Re-attach normalize button event listener
        const normalizeBtn = document.getElementById('normalize-btn');
        if (normalizeBtn) {
            normalizeBtn.addEventListener('click', () => {
                this.normalizeWeights();
            });
        }
    }
    
    updateFromLLM(llmCriteria) {
        // Convert LLM criteria to internal format
        const newWeights = {};
        const newConfig = {};
        
        llmCriteria.forEach(criterion => {
            const key = criterion.id;
            newWeights[key] = criterion.suggestedWeight || 20;
            newConfig[key] = {
                name: criterion.name,
                description: criterion.description,
                direction: criterion.direction,
                unit: criterion.unit || ''
            };
        });
        
        this.weights = newWeights;
        this.criteriaConfig = newConfig;
        
        // Re-render the interface
        this.renderCriteria();
        this.updateDisplays();
        this.notifyChange();
    }
    
    resetToDefault() {
        this.weights = { ...this.defaultWeights };
        this.criteriaConfig = {
            cost: { name: 'Cost', description: 'Lower is better', direction: 'minimize', unit: '($)' },
            quality: { name: 'Quality', description: 'Overall quality rating', direction: 'maximize', unit: '/10' },
            speed: { name: 'Speed', description: 'Performance and speed', direction: 'maximize', unit: '/10' },
            support: { name: 'Support', description: 'Customer support quality', direction: 'maximize', unit: '/10' }
        };
        
        this.renderCriteria();
        this.updateDisplays();
        this.notifyChange();
    }
    
    async regenerateCriteria() {
        if (window.llmIntegration && window.llmIntegration.currentQuery) {
            try {
                const criteriaResult = await window.llmService.generateCriteria(
                    window.llmIntegration.currentQuery, 
                    'general'
                );
                this.updateFromLLM(criteriaResult.criteria);
                
                // Update explanation
                const explanationContainer = document.getElementById('criteria-explanation');
                const explanationText = explanationContainer.querySelector('.explanation-text');
                explanationText.textContent = criteriaResult.reasoning;
                explanationContainer.classList.remove('hidden');
                
            } catch (error) {
                console.error('Failed to regenerate criteria:', error);
                alert('Failed to regenerate criteria. Please try again.');
            }
        }
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
        try {
            if (window.resultsDisplay && typeof window.resultsDisplay.update === 'function') {
                window.resultsDisplay.update().catch(console.error);
            } else {
                console.warn('ResultsDisplay not available for CriteriaWeights.notifyChange');
            }
        } catch (error) {
            console.error('Error in CriteriaWeights.notifyChange:', error);
        }
    }
}
class AnalysisCacheManager {
    constructor() {
        this.cache = new Map();
        this.maxCacheSize = 50;
        this.defaultTTL = 5 * 60 * 1000; // 5 minutes
    }
    
    generateCacheKey(options, query, weights, analysisType) {
        // Create a stable key based on option values, query, and weights
        const optionData = options.map(opt => ({
            id: opt.id,
            name: opt.name,
            cost: opt.cost,
            quality: opt.quality,
            speed: opt.speed,
            support: opt.support
        })).sort((a, b) => a.id.localeCompare(b.id));
        
        const keyData = {
            options: optionData,
            query: query || '',
            weights: weights || {},
            type: analysisType
        };
        
        return this.hashObject(keyData);
    }
    
    getCachedAnalysis(cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > cached.ttl) {
            this.cache.delete(cacheKey);
            return null;
        }
        
        return cached.data;
    }
    
    setCachedAnalysis(cacheKey, analysis, ttl = this.defaultTTL) {
        // Clean up old entries if cache is getting too large
        if (this.cache.size >= this.maxCacheSize) {
            this.cleanupCache();
        }
        
        this.cache.set(cacheKey, {
            data: analysis,
            timestamp: Date.now(),
            ttl: ttl
        });
    }
    
    cleanupCache() {
        // Remove oldest entries
        const entries = Array.from(this.cache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        const toRemove = entries.slice(0, Math.floor(this.maxCacheSize / 2));
        toRemove.forEach(([key]) => this.cache.delete(key));
    }
    
    invalidateCache(pattern) {
        // Remove cache entries that match a pattern
        for (const [key, value] of this.cache.entries()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }
    
    hashObject(obj) {
        const str = JSON.stringify(obj);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
}

class ResultsDisplay {
    constructor() {
        this.container = document.getElementById('results-container');
        this.constraints = {
            maxCost: null,
            minQuality: null
        };
        
        this.analysisCache = new AnalysisCacheManager();
        this.updateDebounceTimer = null;
        this.debounceDelay = 300; // 300ms debounce
        this.lastAnalysisResults = null; // Cache for current session
        
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
    
    async update() {
        // Debounce updates to prevent too many LLM calls
        if (this.updateDebounceTimer) {
            clearTimeout(this.updateDebounceTimer);
        }
        
        this.updateDebounceTimer = setTimeout(() => {
            this.performUpdate();
        }, this.debounceDelay);
    }
    
    async performUpdate() {
        // Check if required dependencies are available
        if (!window.optionManager) {
            console.warn('OptionManager not available, skipping results update');
            return;
        }
        
        if (!window.criteriaWeights) {
            console.warn('CriteriaWeights not available, skipping results update');
            return;
        }
        
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
        
        // Check if we can reuse analysis from cache or previous results
        const canReuseAnalysis = this.canReuseAnalysis(results, weights);
        
        if (canReuseAnalysis && this.lastAnalysisResults) {
            // Just update the display with new scores but reuse analysis
            await this.displayResultsWithCachedAnalysis(results, this.lastAnalysisResults);
        } else {
            // Perform full analysis update
            await this.displayResults(results);
            await this.showDecisionGuidance(results, weights);
            await this.showTradeoffAnalysis(results);
            
            // Cache the analysis results
            this.lastAnalysisResults = {
                options: results.map(r => ({ id: r.id, name: r.name })),
                weights: { ...weights },
                timestamp: Date.now()
            };
        }
        
        if (eliminatedOptions.length > 0) {
            this.showEliminatedOptions(eliminatedOptions);
        }
    }
    
    canReuseAnalysis(currentResults, currentWeights) {
        if (!this.lastAnalysisResults) return false;
        
        // Check if options are the same (same IDs and names)
        const currentOptions = currentResults.map(r => ({ id: r.id, name: r.name }));
        const lastOptions = this.lastAnalysisResults.options;
        
        if (currentOptions.length !== lastOptions.length) return false;
        
        for (let i = 0; i < currentOptions.length; i++) {
            if (currentOptions[i].id !== lastOptions[i].id || 
                currentOptions[i].name !== lastOptions[i].name) {
                return false;
            }
        }
        
        // If only weights changed and it's been less than 30 seconds, reuse analysis
        const timeDiff = Date.now() - this.lastAnalysisResults.timestamp;
        return timeDiff < 30000; // 30 seconds
    }
    
    async displayResultsWithCachedAnalysis(results, cachedAnalysis) {
        // Update display with new scores but keep existing pros/cons analysis
        const maxScore = results.length > 0 ? results[0].score : 10;
        const criteriaKeys = Object.keys(window.criteriaWeights.weights);
        const criteriaConfig = window.criteriaWeights.criteriaConfig;
        
        // Get existing pros/cons from DOM to avoid regenerating
        const existingProsAndCons = this.extractExistingProsAndCons();
        
        this.container.innerHTML = results.map((result, index) => {
            const progressWidth = (result.score / maxScore) * 100;
            const rankEmoji = this.getRankEmoji(result.rank);
            
            // Use existing pros/cons if available, otherwise generate new ones
            const prosAndCons = existingProsAndCons[result.id] || {
                pros: ['Analysis updating...'],
                cons: ['Please wait...']
            };
            
            // Generate dynamic result details based on current criteria
            const resultDetails = criteriaKeys.map(key => {
                const config = criteriaConfig[key];
                const value = result[key];
                return `<div>${config.name}: ${value}${config.unit}</div>`;
            }).join('');
            
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
                        ${resultDetails}
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
    
    extractExistingProsAndCons() {
        const existing = {};
        const resultItems = this.container.querySelectorAll('.result-item');
        
        resultItems.forEach(item => {
            const title = item.querySelector('.result-title')?.textContent;
            if (!title) return;
            
            const prosItems = item.querySelectorAll('.pros li');
            const consItems = item.querySelectorAll('.cons li');
            
            const pros = Array.from(prosItems).map(li => li.textContent);
            const cons = Array.from(consItems).map(li => li.textContent);
            
            // Find the option ID by matching the name
            const options = window.optionManager.getOptions();
            const option = options.find(opt => opt.name === title);
            if (option) {
                existing[option.id] = { pros, cons };
            }
        });
        
        return existing;
    }
    
    applyConstraints(options) {
        const validOptions = [];
        const eliminatedOptions = [];
        
        options.forEach(option => {
            let isValid = true;
            let reasons = [];
            
            if (this.constraints.maxCost !== null && option.cost > this.constraints.maxCost) {
                isValid = false;
                reasons.push(`Cost ${option.cost} exceeds limit of ${this.constraints.maxCost}`);
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
        const criteriaKeys = Object.keys(weights);
        const criteriaConfig = window.criteriaWeights.criteriaConfig;
        
        // Calculate normalization values for each criterion
        const normalizationData = {};
        criteriaKeys.forEach(key => {
            const values = options.map(opt => opt[key] || 0);
            const config = criteriaConfig[key];
            
            if (config.direction === 'minimize') {
                // For minimize criteria (like cost), higher values get lower scores
                normalizationData[key] = {
                    max: Math.max(...values),
                    min: Math.min(...values),
                    direction: 'minimize'
                };
            } else {
                // For maximize criteria, higher values get higher scores
                normalizationData[key] = {
                    max: Math.max(...values),
                    min: Math.min(...values),
                    direction: 'maximize'
                };
            }
        });
        
        const results = options.map(option => {
            let totalScore = 0;
            const criterionScores = {};
            
            criteriaKeys.forEach(key => {
                const value = option[key] || 0;
                const norm = normalizationData[key];
                let normalizedScore;
                
                if (norm.direction === 'minimize') {
                    // For minimize: lower values get higher scores
                    if (norm.max === norm.min) {
                        normalizedScore = 10; // All values are the same
                    } else {
                        normalizedScore = ((norm.max - value) / (norm.max - norm.min)) * 10;
                    }
                } else {
                    // For maximize: higher values get higher scores
                    if (norm.max === norm.min) {
                        normalizedScore = 10; // All values are the same
                    } else {
                        normalizedScore = ((value - norm.min) / (norm.max - norm.min)) * 10;
                    }
                }
                
                criterionScores[key] = normalizedScore;
                totalScore += (normalizedScore * weights[key] / 100);
            });
            
            return {
                ...option,
                score: totalScore,
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
    
    async displayResults(results) {
        const maxScore = results.length > 0 ? results[0].score : 10;
        const criteriaKeys = Object.keys(window.criteriaWeights.weights);
        const criteriaConfig = window.criteriaWeights.criteriaConfig;
        
        // Generate pros and cons for all results asynchronously
        const resultsWithProsAndCons = await Promise.all(
            results.map(async (result) => {
                const prosAndCons = await this.generateProsAndCons(result, results);
                return { ...result, prosAndCons };
            })
        );
        
        this.container.innerHTML = resultsWithProsAndCons.map(result => {
            const progressWidth = (result.score / maxScore) * 100;
            const rankEmoji = this.getRankEmoji(result.rank);
            
            // Generate dynamic result details based on current criteria
            const resultDetails = criteriaKeys.map(key => {
                const config = criteriaConfig[key];
                const value = result[key];
                return `<div>${config.name}: ${value}${config.unit}</div>`;
            }).join('');
            
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
                        ${resultDetails}
                    </div>
                    <div class="result-progress">
                        <div class="progress-bar" style="width: ${progressWidth}%"></div>
                    </div>
                    <div class="pros-cons">
                        <div class="pros">
                            <div class="pros-title">✅ Strengths</div>
                            <ul>${result.prosAndCons.pros.map(pro => `<li>${pro}</li>`).join('')}</ul>
                        </div>
                        <div class="cons">
                            <div class="cons-title">⚠️ Weaknesses</div>
                            <ul>${result.prosAndCons.cons.map(con => `<li>${con}</li>`).join('')}</ul>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    async generateProsAndCons(option, allResults) {
        // Generate cache key for this specific analysis
        const cacheKey = this.analysisCache.generateCacheKey(
            [option], 
            window.llmIntegration?.currentQuery || '', 
            {}, 
            'pros-cons'
        );
        
        // Check cache first
        const cached = this.analysisCache.getCachedAnalysis(cacheKey);
        if (cached) {
            console.log('Using cached pros/cons for', option.name);
            return cached;
        }
        
        // Try to get LLM-generated insights first
        if (window.llmIntegration && window.llmIntegration.isLLMMode && window.llmIntegration.currentQuery) {
            try {
                const context = {
                    query: window.llmIntegration.currentQuery,
                    domain: window.llmIntegration.generatedCriteria?.domain || 'general',
                    allResults: allResults
                };
                
                const insights = await window.llmService.generateQuickInsights(option, context);
                const result = {
                    pros: insights.strengths || ['Analysis unavailable'],
                    cons: insights.weaknesses || ['Unable to analyze']
                };
                
                // Cache the result
                this.analysisCache.setCachedAnalysis(cacheKey, result);
                return result;
            } catch (error) {
                console.warn('LLM insights failed, using rule-based analysis:', error);
            }
        }
        
        // Fallback to enhanced rule-based analysis
        const result = this.generateEnhancedRuleBasedProsAndCons(option, allResults);
        
        // Cache the fallback result with shorter TTL
        this.analysisCache.setCachedAnalysis(cacheKey, result, 2 * 60 * 1000); // 2 minutes
        return result;
    }
    
    generateEnhancedRuleBasedProsAndCons(option, allResults) {
        const pros = [];
        const cons = [];
        
        // Find averages for comparison
        const avgCost = allResults.reduce((sum, r) => sum + r.cost, 0) / allResults.length;
        const avgQuality = allResults.reduce((sum, r) => sum + r.quality, 0) / allResults.length;
        const avgSpeed = allResults.reduce((sum, r) => sum + r.speed, 0) / allResults.length;
        const avgSupport = allResults.reduce((sum, r) => sum + r.support, 0) / allResults.length;
        
        // Enhanced cost analysis (lower is better)
        if (option.cost < avgCost * 0.7) {
            pros.push(`Excellent value at ${option.cost} (${Math.round((avgCost - option.cost) / avgCost * 100)}% below average)`);
        } else if (option.cost < avgCost * 0.9) {
            pros.push(`Competitive pricing at ${option.cost}`);
        } else if (option.cost > avgCost * 1.3) {
            cons.push(`Premium pricing at ${option.cost} (${Math.round((option.cost - avgCost) / avgCost * 100)}% above average)`);
        } else if (option.cost > avgCost * 1.1) {
            cons.push(`Higher cost at ${option.cost} compared to alternatives`);
        }
        
        // Enhanced quality analysis
        if (option.quality >= 9) {
            pros.push(`Outstanding quality rating (${option.quality}/10) - top tier performance`);
        } else if (option.quality >= 8) {
            pros.push(`High quality rating (${option.quality}/10) - reliable performance`);
        } else if (option.quality < avgQuality * 0.8) {
            cons.push(`Below average quality (${option.quality}/10) - may impact reliability`);
        }
        
        // Enhanced speed analysis
        if (option.speed >= 9) {
            pros.push(`Exceptional performance (${option.speed}/10) - ideal for demanding workloads`);
        } else if (option.speed >= 8) {
            pros.push(`Strong performance (${option.speed}/10) - handles most tasks well`);
        } else if (option.speed < avgSpeed * 0.8) {
            cons.push(`Performance concerns (${option.speed}/10) - may struggle with intensive tasks`);
        }
        
        // Enhanced support analysis
        if (option.support >= 9) {
            pros.push(`Excellent support (${option.support}/10) - comprehensive help available`);
        } else if (option.support >= 8) {
            pros.push(`Good support quality (${option.support}/10) - reliable assistance`);
        } else if (option.support < avgSupport * 0.8) {
            cons.push(`Limited support (${option.support}/10) - may need self-service approach`);
        }
        
        // Add contextual insights based on option characteristics
        const standoutFeatures = [];
        if (option.cost <= Math.min(...allResults.map(r => r.cost))) {
            standoutFeatures.push('most affordable option');
        }
        if (option.quality >= Math.max(...allResults.map(r => r.quality))) {
            standoutFeatures.push('highest quality rating');
        }
        if (option.speed >= Math.max(...allResults.map(r => r.speed))) {
            standoutFeatures.push('best performance');
        }
        if (option.support >= Math.max(...allResults.map(r => r.support))) {
            standoutFeatures.push('superior support');
        }
        
        if (standoutFeatures.length > 0) {
            pros.push(`Leads in: ${standoutFeatures.join(', ')}`);
        }
        
        // Ensure we have meaningful content
        if (pros.length === 0) {
            pros.push(`Solid middle-ground option with ${option.quality}/10 quality`);
        }
        if (cons.length === 0) {
            cons.push('No major weaknesses identified in comparison');
        }
        
        return { pros, cons };
    }
    
    async showDecisionGuidance(results, weights) {
        const guidanceContainer = document.getElementById('decision-guidance');
        const guidanceContent = document.getElementById('guidance-content');
        
        if (results.length < 2) {
            guidanceContainer.classList.add('hidden');
            return;
        }
        
        // Generate cache key for decision guidance
        const cacheKey = this.analysisCache.generateCacheKey(
            results.slice(0, 5), 
            window.llmIntegration?.currentQuery || '', 
            weights, 
            'decision-guidance'
        );
        
        // Check cache first
        const cached = this.analysisCache.getCachedAnalysis(cacheKey);
        if (cached) {
            console.log('Using cached decision guidance');
            guidanceContent.innerHTML = cached;
            guidanceContainer.classList.remove('hidden');
            return;
        }
        
        // Try to get LLM-generated decision guidance
        if (window.llmIntegration && window.llmIntegration.isLLMMode && window.llmIntegration.currentQuery) {
            try {
                const domain = window.llmIntegration.generatedCriteria?.domain || 'general';
                const analysis = await window.llmService.generateOptionAnalysis(
                    results.slice(0, 5), // Top 5 options
                    window.llmIntegration.currentQuery,
                    domain,
                    weights
                );
                
                if (analysis.decisionGuidance && analysis.decisionGuidance.length > 0) {
                    const guidanceHTML = analysis.decisionGuidance.map(item => `
                        <div class="guidance-item">
                            <div class="guidance-scenario">${item.scenario}:</div>
                            <div class="guidance-recommendation">${item.recommendation}</div>
                            ${item.reasoning ? `<div class="guidance-reasoning" style="font-size: 0.85em; color: var(--text-secondary); margin-top: 0.25rem;">${item.reasoning}</div>` : ''}
                        </div>
                    `).join('');
                    
                    // Cache the result
                    this.analysisCache.setCachedAnalysis(cacheKey, guidanceHTML);
                    
                    guidanceContent.innerHTML = guidanceHTML;
                    guidanceContainer.classList.remove('hidden');
                    return;
                }
            } catch (error) {
                console.warn('LLM decision guidance failed, using rule-based guidance:', error);
            }
        }
        
        // Fallback to enhanced rule-based guidance
        this.showEnhancedRuleBasedGuidance(results, weights, guidanceContainer, guidanceContent, cacheKey);
    }
    
    showEnhancedRuleBasedGuidance(results, weights, guidanceContainer, guidanceContent, cacheKey = null) {
        const topOption = results[0];
        const secondOption = results[1];
        
        // Determine primary decision factors
        const topWeight = Math.max(...Object.values(weights));
        const primaryCriterion = Object.keys(weights).find(key => weights[key] === topWeight);
        
        let guidance = [];
        
        // Overall recommendation with reasoning
        guidance.push({
            scenario: "Overall Best Choice",
            recommendation: `${topOption.name} scores highest (${topOption.score.toFixed(1)}) with your current priorities`,
            reasoning: `Excels in ${primaryCriterion} which you've weighted as most important (${weights[primaryCriterion]}%)`
        });
        
        // Budget-focused guidance with savings calculation
        const cheapestOption = results.reduce((min, option) => option.cost < min.cost ? option : min);
        if (cheapestOption.id !== topOption.id) {
            const savings = topOption.cost - cheapestOption.cost;
            const savingsPercent = Math.round((savings / topOption.cost) * 100);
            guidance.push({
                scenario: "If Budget is Critical",
                recommendation: `${cheapestOption.name} at ${cheapestOption.cost}`,
                reasoning: `Saves ${savings} (${savingsPercent}%) vs top choice while maintaining ${cheapestOption.quality}/10 quality`
            });
        }
        
        // Performance-focused guidance
        const fastestOption = results.reduce((max, option) => option.speed > max.speed ? option : max);
        if (fastestOption.id !== topOption.id) {
            guidance.push({
                scenario: "If Performance is Key",
                recommendation: `${fastestOption.name} offers the best speed (${fastestOption.speed}/10)`,
                reasoning: `Ideal for demanding workloads where performance outweighs other factors`
            });
        }
        
        // Quality-focused guidance
        const highestQuality = results.reduce((max, option) => option.quality > max.quality ? option : max);
        if (highestQuality.id !== topOption.id) {
            guidance.push({
                scenario: "If Quality Matters Most",
                recommendation: `${highestQuality.name} provides the highest quality (${highestQuality.quality}/10)`,
                reasoning: `Best choice for mission-critical applications where reliability is paramount`
            });
        }
        
        // Balanced option guidance
        if (results.length >= 3) {
            const balancedOption = results.find(option => 
                option.id !== topOption.id && 
                option.id !== cheapestOption.id &&
                Math.abs(option.score - (results[0].score + results[results.length-1].score) / 2) < 1
            ) || results[Math.floor(results.length / 2)];
            
            if (balancedOption) {
                guidance.push({
                    scenario: "For Balanced Approach",
                    recommendation: `${balancedOption.name} offers good all-around value`,
                    reasoning: `Provides solid performance across all criteria without major trade-offs`
                });
            }
        }
        
        const guidanceHTML = guidance.map(item => `
            <div class="guidance-item">
                <div class="guidance-scenario">${item.scenario}:</div>
                <div class="guidance-recommendation">${item.recommendation}</div>
                ${item.reasoning ? `<div class="guidance-reasoning" style="font-size: 0.85em; color: var(--text-secondary); margin-top: 0.25rem;">${item.reasoning}</div>` : ''}
            </div>
        `).join('');
        
        // Cache the result if cache key provided
        if (cacheKey) {
            this.analysisCache.setCachedAnalysis(cacheKey, guidanceHTML, 2 * 60 * 1000); // 2 minutes
        }
        
        guidanceContent.innerHTML = guidanceHTML;
        guidanceContainer.classList.remove('hidden');
    }
    
    async showTradeoffAnalysis(results) {
        const tradeoffContainer = document.getElementById('tradeoff-analysis');
        const tradeoffContent = document.getElementById('tradeoff-content');
        
        if (results.length < 2) {
            tradeoffContainer.classList.add('hidden');
            return;
        }
        
        // Generate cache key for trade-off analysis
        const cacheKey = this.analysisCache.generateCacheKey(
            results.slice(0, 3), 
            window.llmIntegration?.currentQuery || '', 
            {}, 
            'tradeoff-analysis'
        );
        
        // Check cache first
        const cached = this.analysisCache.getCachedAnalysis(cacheKey);
        if (cached) {
            console.log('Using cached trade-off analysis');
            tradeoffContent.innerHTML = cached;
            tradeoffContainer.classList.remove('hidden');
            return;
        }
        
        // Try to get LLM-generated trade-off analysis
        if (window.llmIntegration && window.llmIntegration.isLLMMode && window.llmIntegration.currentQuery) {
            try {
                const domain = window.llmIntegration.generatedCriteria?.domain || 'general';
                const weights = window.criteriaWeights.getWeights();
                const analysis = await window.llmService.generateOptionAnalysis(
                    results.slice(0, 5), // Top 5 options
                    window.llmIntegration.currentQuery,
                    domain,
                    weights
                );
                
                if (analysis.tradeoffs && analysis.tradeoffs.length > 0) {
                    const tradeoffHTML = analysis.tradeoffs.map(tradeoff => `
                        <div class="tradeoff-item">
                            <div class="tradeoff-comparison">${tradeoff.comparison}</div>
                            <div class="tradeoff-explanation">${tradeoff.explanation}</div>
                            ${tradeoff.recommendation ? `<div class="tradeoff-recommendation" style="font-size: 0.85em; color: var(--text-secondary); margin-top: 0.25rem; font-style: italic;">${tradeoff.recommendation}</div>` : ''}
                        </div>
                    `).join('');
                    
                    // Cache the result
                    this.analysisCache.setCachedAnalysis(cacheKey, tradeoffHTML);
                    
                    tradeoffContent.innerHTML = tradeoffHTML;
                    tradeoffContainer.classList.remove('hidden');
                    return;
                }
            } catch (error) {
                console.warn('LLM trade-off analysis failed, using rule-based analysis:', error);
            }
        }
        
        // Fallback to enhanced rule-based trade-off analysis
        this.showEnhancedRuleBasedTradeoffs(results, tradeoffContainer, tradeoffContent, cacheKey);
    }
    
    showEnhancedRuleBasedTradeoffs(results, tradeoffContainer, tradeoffContent, cacheKey = null) {
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
        
        // Add enhanced contextual trade-offs
        if (results.length >= 3) {
            const cheapest = results.reduce((min, option) => option.cost < min.cost ? option : min);
            const fastest = results.reduce((max, option) => option.speed > max.speed ? option : max);
            const highestQuality = results.reduce((max, option) => option.quality > max.quality ? option : max);
            
            // Cost vs Performance trade-off
            if (cheapest.id !== fastest.id) {
                const costSavings = fastest.cost - cheapest.cost;
                const performanceGain = fastest.speed - cheapest.speed;
                tradeoffs.push({
                    comparison: `${cheapest.name} vs ${fastest.name}`,
                    explanation: `Save ${costSavings} with ${cheapest.name} but sacrifice ${performanceGain} points of performance. Choose ${cheapest.name} for budget projects, ${fastest.name} for performance-critical applications.`
                });
            }
            
            // Quality vs Cost trade-off
            if (cheapest.id !== highestQuality.id) {
                const costDiff = highestQuality.cost - cheapest.cost;
                const qualityGain = highestQuality.quality - cheapest.quality;
                tradeoffs.push({
                    comparison: `${cheapest.name} vs ${highestQuality.name}`,
                    explanation: `Pay ${costDiff} more for ${highestQuality.name} to gain ${qualityGain} points of quality. Consider ${highestQuality.name} for mission-critical applications where reliability matters most.`
                });
            }
        }
        
        const tradeoffHTML = tradeoffs.map(tradeoff => `
            <div class="tradeoff-item">
                <div class="tradeoff-comparison">${tradeoff.comparison}</div>
                <div class="tradeoff-explanation">${tradeoff.explanation}</div>
            </div>
        `).join('');
        
        // Cache the result if cache key provided
        if (cacheKey) {
            this.analysisCache.setCachedAnalysis(cacheKey, tradeoffHTML, 2 * 60 * 1000); // 2 minutes
        }
        
        tradeoffContent.innerHTML = tradeoffHTML;
        tradeoffContainer.classList.remove('hidden');
    }
    
    analyzeTradeoff(optionA, optionB) {
        const differences = [];
        
        // Cost comparison
        const costDiff = optionA.cost - optionB.cost;
        if (Math.abs(costDiff) > 10) {
            if (costDiff > 0) {
                differences.push(`${optionA.name} costs ${costDiff} more`);
            } else {
                differences.push(`${optionA.name} costs ${Math.abs(costDiff)} less`);
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
    
    invalidateAnalysisCache() {
        // Clear all cached analysis when options change
        this.analysisCache.cache.clear();
        this.lastAnalysisResults = null;
        console.log('Analysis cache invalidated due to option changes');
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

// Global functions for direct HTML access
window.openConfigModal = function() {
    console.log('openConfigModal called');
    try {
        if (window.llmIntegration) {
            window.llmIntegration.showConfigModal();
        } else {
            console.error('LLM Integration not initialized');
            // Fallback: show modal directly
            const modal = document.getElementById('config-modal');
            if (modal) {
                modal.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Error opening config modal:', error);
    }
};

window.switchToManualMode = function() {
    console.log('switchToManualMode called');
    try {
        if (window.llmIntegration) {
            window.llmIntegration.switchToManualMode();
        } else {
            console.log('Switching to manual mode (fallback)');
            alert('Switched to manual mode');
        }
    } catch (error) {
        console.error('Error switching to manual mode:', error);
    }
};

window.closeConfigModal = function() {
    console.log('closeConfigModal called');
    try {
        if (window.llmIntegration) {
            window.llmIntegration.hideConfigModal();
        } else {
            // Fallback: hide modal directly
            const modal = document.getElementById('config-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
        }
    } catch (error) {
        console.error('Error closing config modal:', error);
    }
};

window.saveConfigModal = function() {
    console.log('saveConfigModal called');
    try {
        if (window.llmIntegration) {
            window.llmIntegration.saveConfiguration();
        } else {
            // Fallback: basic save
            const provider = document.getElementById('provider-select')?.value;
            const apiKey = document.getElementById('api-key-input')?.value;
            const endpoint = document.getElementById('endpoint-input')?.value;
            const model = document.getElementById('model-input')?.value;
            
            if (window.config) {
                if (provider) window.config.setProvider(provider);
                if (apiKey) window.config.setApiKey(apiKey);
                if (endpoint) window.config.setEndpoint(endpoint);
                if (model) window.config.setModel(model);
            }
            
            window.closeConfigModal();
            alert('Configuration saved!');
        }
    } catch (error) {
        console.error('Error saving config:', error);
        alert('Error saving configuration');
    }
};

window.testLLMConnection = async function() {
    console.log('testLLMConnection called');
    const testBtn = document.getElementById('test-connection');
    
    try {
        // Temporarily save current form values
        const provider = document.getElementById('provider-select')?.value;
        const apiKey = document.getElementById('api-key-input')?.value;
        const endpoint = document.getElementById('endpoint-input')?.value;
        const model = document.getElementById('model-input')?.value;
        
        if (window.config) {
            if (provider) window.config.setProvider(provider);
            if (apiKey) window.config.setApiKey(apiKey);
            if (endpoint) window.config.setEndpoint(endpoint);
            if (model) window.config.setModel(model);
        }
        
        // Update button state
        testBtn.disabled = true;
        testBtn.textContent = '🔄 Testing...';
        
        // Test connection
        const result = await window.config.testConnection();
        
        // Show success
        testBtn.textContent = '✅ Success!';
        testBtn.style.backgroundColor = '#10b981';
        alert(`Connection successful!\n\nProvider: ${provider}\nModel: ${model}\nResponse received successfully.`);
        
    } catch (error) {
        console.error('Connection test failed:', error);
        
        // Show error
        testBtn.textContent = '❌ Failed';
        testBtn.style.backgroundColor = '#ef4444';
        
        let errorMessage = `Connection test failed:\n\n${error.message}`;
        
        // Add helpful suggestions based on error type
        if (error.message.includes('CORS') || error.message.includes('Network error')) {
            errorMessage += '\n\n🔧 CORS/Network Error Solutions:\n';
            errorMessage += '1. Check if LM Studio is running and has a model loaded\n';
            errorMessage += '2. Verify the endpoint URL and port number\n';
            errorMessage += '3. In LM Studio, go to "Local Server" tab and:\n';
            errorMessage += '   - Make sure "CORS" is enabled\n';
            errorMessage += '   - Check "Apply CORS headers" if available\n';
            errorMessage += '   - Try restarting the local server\n';
            errorMessage += '4. Try using 127.0.0.1 instead of localhost';
        } else if (error.message.includes('404')) {
            errorMessage += '\n\nTip: 404 error suggests wrong endpoint. Check:\n- Endpoint URL format\n- Model server is running on that port';
        } else if (error.message.includes('401') || error.message.includes('403')) {
            errorMessage += '\n\nTip: Authentication error. Check:\n- API key is correct\n- API key is required for this provider';
        } else if (error.message.includes('messages')) {
            errorMessage += '\n\nTip: Request format error. This might be:\n- Wrong model name\n- Server expecting different request format\n- Model not loaded in LM Studio';
        }
        
        alert(errorMessage);
        
    } finally {
        // Reset button after 3 seconds
        setTimeout(() => {
            testBtn.disabled = false;
            testBtn.textContent = '🔗 Test Connection';
            testBtn.style.backgroundColor = '';
        }, 3000);
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting initialization...');
    
    // Initialize in stages to catch specific errors
    try {
        console.log('Creating OptionManager...');
        window.optionManager = new OptionManager();
        console.log('OptionManager created successfully');
    } catch (error) {
        console.error('Error creating OptionManager:', error);
        console.log('Attempting to create fallback OptionManager...');
        
        // Create a minimal fallback OptionManager
        try {
            window.optionManager = {
                options: [],
                container: document.getElementById('options-container'),
                addButton: document.getElementById('add-option-btn'),
                
                addOption: function(name, attributes) {
                    console.log('Fallback addOption called:', name, attributes);
                    const option = {
                        id: Date.now().toString(),
                        name: name || `Option ${String.fromCharCode(65 + this.options.length)}`,
                        cost: 100,
                        quality: 5,
                        speed: 5,
                        support: 5,
                        ...attributes
                    };
                    this.options.push(option);
                    console.log('Option added to fallback manager:', option);
                    
                    // Invalidate analysis cache when options change
                    if (window.resultsDisplay && window.resultsDisplay.invalidateAnalysisCache) {
                        window.resultsDisplay.invalidateAnalysisCache();
                    }
                    
                    // Render the option in DOM
                    this.renderOption(option);
                    
                    // Try to trigger results update
                    if (window.resultsDisplay && typeof window.resultsDisplay.update === 'function') {
                        window.resultsDisplay.update().catch(console.error);
                    }
                },
                
                renderOption: function(option) {
                    if (!this.container) return;
                    
                    const optionElement = document.createElement('div');
                    optionElement.className = 'option-item';
                    optionElement.dataset.id = option.id;
                    
                    optionElement.innerHTML = `
                        <div class="option-header">
                            <input type="text" class="option-name" value="${option.name}" placeholder="Option name">
                            <button class="remove-option" onclick="window.optionManager.removeOption('${option.id}')">Remove</button>
                        </div>
                        <div class="option-attributes">
                            <div class="attribute-group">
                                <label class="attribute-label">Cost ($)</label>
                                <input type="number" class="attribute-input" data-field="cost" value="${option.cost}" min="0">
                            </div>
                            <div class="attribute-group">
                                <label class="attribute-label">Quality /10</label>
                                <input type="number" class="attribute-input" data-field="quality" value="${option.quality}" min="1" max="10">
                            </div>
                            <div class="attribute-group">
                                <label class="attribute-label">Speed /10</label>
                                <input type="number" class="attribute-input" data-field="speed" value="${option.speed}" min="1" max="10">
                            </div>
                            <div class="attribute-group">
                                <label class="attribute-label">Support /10</label>
                                <input type="number" class="attribute-input" data-field="support" value="${option.support}" min="1" max="10">
                            </div>
                        </div>
                    `;
                    
                    // Add event listeners
                    const nameInput = optionElement.querySelector('.option-name');
                    nameInput.addEventListener('input', (e) => {
                        option.name = e.target.value;
                        
                        // Invalidate analysis cache when options change
                        if (window.resultsDisplay && window.resultsDisplay.invalidateAnalysisCache) {
                            window.resultsDisplay.invalidateAnalysisCache();
                        }
                        
                        if (window.resultsDisplay) window.resultsDisplay.update().catch(console.error);
                    });
                    
                    const attributeInputs = optionElement.querySelectorAll('.attribute-input');
                    attributeInputs.forEach(input => {
                        input.addEventListener('input', (e) => {
                            const field = e.target.dataset.field;
                            const value = parseFloat(e.target.value) || 0;
                            option[field] = value;
                            
                            // Invalidate analysis cache when options change
                            if (window.resultsDisplay && window.resultsDisplay.invalidateAnalysisCache) {
                                window.resultsDisplay.invalidateAnalysisCache();
                            }
                            
                            if (window.resultsDisplay) window.resultsDisplay.update().catch(console.error);
                        });
                    });
                    
                    this.container.appendChild(optionElement);
                },
                
                removeOption: function(id) {
                    this.options = this.options.filter(opt => opt.id !== id);
                    this.renderAll();
                    
                    // Invalidate analysis cache when options change
                    if (window.resultsDisplay && window.resultsDisplay.invalidateAnalysisCache) {
                        window.resultsDisplay.invalidateAnalysisCache();
                    }
                    
                    if (window.resultsDisplay) window.resultsDisplay.update().catch(console.error);
                },
                
                renderAll: function() {
                    if (!this.container) return;
                    this.container.innerHTML = '';
                    this.options.forEach(option => this.renderOption(option));
                },
                
                getOptions: function() {
                    return this.options;
                },
                
                loadOptions: function(options) {
                    this.options = options || [];
                    this.renderAll();
                    
                    // Invalidate analysis cache when options change
                    if (window.resultsDisplay && window.resultsDisplay.invalidateAnalysisCache) {
                        window.resultsDisplay.invalidateAnalysisCache();
                    }
                    
                    if (window.resultsDisplay) window.resultsDisplay.update().catch(console.error);
                },
                
                notifyChange: function() {
                    if (window.resultsDisplay && typeof window.resultsDisplay.update === 'function') {
                        window.resultsDisplay.update().catch(console.error);
                    }
                },
                
                init: function() {
                    // Add event listener to add button
                    if (this.addButton) {
                        this.addButton.addEventListener('click', () => this.addOption());
                        console.log('Fallback: Add button event listener attached');
                    }
                    
                    // Don't add any initial options - start empty
                    console.log('Fallback OptionManager initialized without default options');
                }
            };
            
            // Initialize the fallback
            window.optionManager.init();
            console.log('Fallback OptionManager created and initialized');
        } catch (fallbackError) {
            console.error('Failed to create fallback OptionManager:', fallbackError);
        }
    }
    
    try {
        console.log('Creating CriteriaWeights...');
        window.criteriaWeights = new CriteriaWeights();
        console.log('CriteriaWeights created successfully');
    } catch (error) {
        console.error('Error creating CriteriaWeights:', error);
    }
    
    try {
        console.log('Creating ResultsDisplay...');
        window.resultsDisplay = new ResultsDisplay();
        console.log('ResultsDisplay created successfully');
    } catch (error) {
        console.error('Error creating ResultsDisplay:', error);
    }
    
    try {
        console.log('Creating QuickExamples...');
        window.quickExamples = new QuickExamples();
        console.log('QuickExamples created successfully');
    } catch (error) {
        console.error('Error creating QuickExamples:', error);
    }
    
    try {
        console.log('Creating LLMIntegrationManager...');
        window.llmIntegration = new LLMIntegrationManager();
        console.log('LLMIntegrationManager created successfully');
    } catch (error) {
        console.error('Error creating LLMIntegrationManager:', error);
        console.log('Continuing without LLM integration...');
    }
    
    // Initial update
    try {
        if (window.resultsDisplay && window.optionManager && window.criteriaWeights) {
            console.log('Performing initial results update...');
            window.resultsDisplay.update().catch(console.error);
        } else {
            console.warn('Skipping initial update - some components not initialized');
        }
    } catch (error) {
        console.error('Error updating results display:', error);
    }
    
    // Add backup event listeners
    setTimeout(() => {
        console.log('Adding backup event listeners...');
        
        try {
            const configBtn = document.getElementById('config-btn');
            const manualModeBtn = document.getElementById('manual-mode-btn');
            
            if (configBtn && !configBtn.hasAttribute('data-listener-added')) {
                console.log('Adding config button listener');
                configBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Config button clicked via backup listener');
                    window.openConfigModal();
                });
                configBtn.setAttribute('data-listener-added', 'true');
            }
            
            if (manualModeBtn && !manualModeBtn.hasAttribute('data-listener-added')) {
                console.log('Adding manual mode button listener');
                manualModeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Manual mode button clicked via backup listener');
                    window.switchToManualMode();
                });
                manualModeBtn.setAttribute('data-listener-added', 'true');
            }
        } catch (error) {
            console.error('Error adding backup listeners:', error);
        }
    }, 500);
    
    console.log('Application initialization completed');
});