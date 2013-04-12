tinyMCEPopup.requireLangPack();

/*
 * Provides a popup with a wizard process to allow the user to spellcheck the
 * contents of a TinyMCE editor. 
 */
var SpellcheckWizard = {
	
	// windowArgs
	PLUGIN : "plugin",
	WORD_NODES : "wordNodes",
	MISSPELLED_WORDS : "misspelledWords",
	SELECTED_LANG : "selectedLang",
	CALLBACK : "callback",
	ALLOW_ADD_TO_DICTIONARY : "allowAddToDictionary",
	// form components
	NOT_IN_DICT_FIELD : "spellcheckwizard_notindictionary",
	CHANGE_TO_FIELD : "spellcheckwizard_changeto",
	SUGGESTIONS_FIELD : "spellcheckwizard_suggestions",
	ADD_WORDS_TO_FIELD : "spellcheckwizard_addwordsto",
	IGNORE_BUTTON:"ignore",
    IGNORE_ALL_BUTTON:"ignoreAll",
    CHANGE_BUTTON:"change",
    CHANGE_ALL_BUTTON:"changeAll",
    ADD_BUTTON:"add",
    CANCEL_BUTTON:"cancel",
    UNDO_BUTTON:"undo",
    
	// translations
	NO_SUGGESTIONS_FOUND : "spellchecker_dlg.no_suggestions_found",
	IGNORE_ACCESS_KEY:"spellchecker_dlg.ignoreAccessKey",
	IGNORE_ALL_ACCESS_KEY:"spellchecker_dlg.ignoreAllAccessKey",
	CHANGE_ACCESS_KEY:"spellchecker_dlg.changeAccessKey",
	CHANGE_ALL_ACCESS_KEY:"spellchecker_dlg.changeAllAccessKey",
	ADD_ACCESS_KEY:"spellchecker_dlg.addAccessKey",
	CANCEL_ACCESS_KEY:"spellchecker_dlg.cancelAccessKey",
    UNDO_ACCESS_KEY:"spellchecker_dlg.undoAccessKey",
    
	// CSS
	HIDDEN_CLASS : "hidden",
	
	plugin : null,
	allNodes : null, // take DOM nodes rather than a simple array as a parameter to allow us to underline misspellings
	allWords : null,
	wordPosition : -1,
	misspelledWords : null,
	selectedLang : null,
	editor : null,
	callback : null,
	allowAddToDictionary : null,
	
	init : function(ed) {
		this.editor = ed;
		this.plugin = tinyMCEPopup.getWindowArg(this.PLUGIN);
		this.allNodes = tinyMCEPopup.getWindowArg(this.WORD_NODES);
        this.misspelledWords = tinyMCEPopup.getWindowArg(this.MISSPELLED_WORDS);
        this.selectedLang = tinyMCEPopup.getWindowArg(this.SELECTED_LANG);
        this.callback = tinyMCEPopup.getWindowArg(this.CALLBACK);
        this.allowAddToDictionary = tinyMCEPopup.getWindowArg(this.ALLOW_ADD_TO_DICTIONARY);

        if (tinymce.isIE){
            document.detachEvent("onmouseup", tinyMCEPopup._restoreSelection);
        }

        this.editor.spellcheckCancelled = false;
        
        this.setAddToDictionaryButtonVisibility(this.allowAddToDictionary);
        this.setButtonAccessKeys();
        this.setLanguages(this.plugin.languages, this.selectedLang);
        
		this.buildWordListFromAllNodes();
        this.moveToNextMisspelledWord();

        // Attach the same close mechanism as if you pressed the Cancel button on the dialog.
        tinyMCEPopup.getWin().$("a[class='mceClose']").click(function() {
            SpellcheckWizard.onClose();
        });
    },
	
	buildWordListFromAllNodes : function() {
		var node, rng = this.editor.dom.createRng();
		this.allWords = [];
		
		for (var i = 0; i < this.allNodes.length; ++i) {
			node = this.allNodes[i];
			this.plugin.findWord(node, rng);
			if (node == rng.startContainer) {
				this.allWords.push(new WordWrapper(this.plugin, node, this.allWords.length));
			}
		}
	},
    
    setAddToDictionaryButtonVisibility : function(visible) {
    	var addButton = this.getField(this.ADD_BUTTON);
    	if (!visible) {
    		this.editor.dom.addClass(addButton, this.HIDDEN_CLASS);
    	}
    	else {
    		this.editor.dom.removeClass(addButton, this.HIDDEN_CLASS);
    	}
    },
    
    setButtonAccessKeys : function() {
    	this.setButtonAccessKey(this.IGNORE_BUTTON, this.IGNORE_ACCESS_KEY);
	    this.setButtonAccessKey(this.IGNORE_ALL_BUTTON, this.IGNORE_ALL_ACCESS_KEY);
	    this.setButtonAccessKey(this.CHANGE_BUTTON, this.CHANGE_ACCESS_KEY);
	    this.setButtonAccessKey(this.CHANGE_ALL_BUTTON, this.CHANGE_ALL_ACCESS_KEY);
	    this.setButtonAccessKey(this.ADD_BUTTON, this.ADD_ACCESS_KEY);
	    this.setButtonAccessKey(this.CANCEL_BUTTON, this.CANCEL_ACCESS_KEY);
	    this.setButtonAccessKey(this.UNDO_BUTTON, this.UNDO_ACCESS_KEY);
    },
    
    setButtonAccessKey : function(id, translationKey) {
    	var accessKey = this.editor.getLang(translationKey, "");
    	if (accessKey) {
    		this.setAccessKey(id, accessKey);
    	}
    },

    // Current Word

    updateMisspelledWord : function() {
        var misspelledWord = this.getCurrentWord().getValue() || "";
        this.markCurrentWord();
        this.setNotInDictionaryValue(misspelledWord);
        this.setChangeToValue("");
        this.updateSuggestions();
    },
    
    moveToNextMisspelledWord : function() {
        this.unmarkCurrentWord();
		do {
			this.wordPosition++;
		} while (this.wordPosition < this.allWords.length &&
			(this.getCurrentWord().isIgnored() || !this.isCurrentWordMisspelled()));
    	
        if (this.wordPosition == this.allWords.length ) {
            this.spellcheckComplete();
        }
        else {
        	this.updateMisspelledWord();
        }
    },
    
    isMisspelledWord : function(word) {
    	var returnVal = false
    	if (word !== null || typeof(word) !== "undefined") {
    		returnVal = !!this.misspelledWords[word]
    	}
    	return returnVal;
    },
	
	isCurrentWordMisspelled : function() {
    	return this.isMisspelledWord(this.getCurrentWord().getValue());
	},
	
	getCurrentWord : function() {
		return this.allWords[this.wordPosition];
	},
	
	getCurrentWordPosition : function() {
    	return this.wordPosition;
    },
    
    setCurrentWordPosition : function(wordPosition) {
    	this.wordPosition = wordPosition;
    },
    
    markCurrentWord : function() {
    	var currentWord = this.getCurrentWord();
    	if (currentWord) {
    		currentWord.mark();
    	}
    },
    
    unmarkCurrentWord : function() {
    	var currentWord = this.getCurrentWord();
    	if (currentWord) {
    		currentWord.unmark();
    	}
    },
    
    // Not In Dictionary. Ignore, IgnoreAll
    
    setNotInDictionaryValue : function(value) {
    	this.setFieldValue(this.NOT_IN_DICT_FIELD, value);
    },
    
    onIgnore : function() {
    	var word = this.getCurrentWord();
		word.ignore();
    	UndoManager.getInstance().onIgnore(word);
    	this.moveToNextMisspelledWord();
    },
    
    onIgnoreAll : function() {
    	var word = this.getCurrentWord();
        var ignoredWords;
		
		ignoredWords = this.ignoreAllInRemainingWords(word.getValue());
		UndoManager.getInstance().onIgnoreAll(word, ignoredWords);
    	this.moveToNextMisspelledWord();
    },
	
	ignoreAllInRemainingWords : function(word) {
		var currentPosition = this.getCurrentWordPosition();
		var ignoredWords = [];
    	for (var i = currentPosition; i < this.allWords.length; ++i) {
			if (this.allWords[i].getValue() == word) {
				this.allWords[i].ignore();
				ignoredWords.push(this.allWords[i]);
			}
		}
		return ignoredWords;
    },
    
    // Change To, Change, ChangeAll
    
    setChangeToValue : function(value) {
        this.setFieldValue(this.CHANGE_TO_FIELD, value);
    },
    
    getChangeToValue : function() {
    	return this.getFieldValue(this.CHANGE_TO_FIELD);
    },
    
    onChange : function() {
    	var word = this.getCurrentWord();
    	if (word) {
    		var changeToValue = this.getChangeToValue();
    		word.replace(changeToValue);
			UndoManager.getInstance().onChange(word);
    		this.moveToNextMisspelledWord();
    	}
    },
    
    onChangeAll : function() {
		var currentMisspelled = this.getCurrentWord();
        var changedWords;
		
		changedWords = this.replaceAllInRemainingWords(currentMisspelled.getValue(), this.getChangeToValue());
		UndoManager.getInstance().onChangeAll(currentMisspelled, changedWords);
    	this.moveToNextMisspelledWord();
    },
    
    replaceAllInRemainingWords : function(oldWord, newWord) {
		var currentPosition = this.getCurrentWordPosition();
		var changedWords = [];
    	for (var i = currentPosition; i < this.allWords.length; ++i) {
			if (this.allWords[i].getValue() == oldWord) {
				this.allWords[i].replace(newWord);
				changedWords.push(this.allWords[i]);
			}
		}
		return changedWords;
    },
    
    // Suggestions
    
    getSuggestionsField : function() {
    	return this.getField(this.SUGGESTIONS_FIELD);
    },
    
    selectSuggestion : function(index) {
        this.selectOptionMenuItem(this.SUGGESTIONS_FIELD, index);
    },
    
    getSelectedSuggestion : function() {
        return this.getSelectedOption(this.SUGGESTIONS_FIELD);
    },
    
    updateSuggestions : function() {
    	var t = this;
    	this.getSuggestions(this.getSelectedLanguageCode(), this.getCurrentWord().getValue(), function(values) {
    		if (values.length > 0) {
    		    t.setSuggestions(values); 
    		}
    		else {
    			t.setNoSuggestions();
    		}
        });
    },
    
    getSuggestions : function(languageCode, word, handler) {
        this.plugin.getSuggestions(languageCode,  word, handler);
    },
    
    clearSuggestions : function() {
        this.clearOptions(this.SUGGESTIONS_FIELD);
    },
    
    setSuggestions: function(suggestions) {
    	this.clearSuggestions();
    	var t = this;
        tinymce.each(suggestions, function(value, name) {
            t.addSuggestion(value);
        });
        
        this.selectSuggestion(0);
        this.setChangeToValue(this.getSelectedSuggestion() || "");
        this.getSuggestionsField().onchange = function(){ t.onSuggestionSelected() };
    },
    
    setNoSuggestions : function() {
    	this.clearSuggestions();
    	this.addSuggestion(this.editor.getLang(this.NO_SUGGESTIONS_FOUND, this.NO_SUGGESTIONS_FOUND));
    	this.setChangeToValue("");
    	this.getSuggestionsField().onchange = null;
    },
    
    addSuggestion : function(value) {
    	var t = this;
    	this.addOption(this.SUGGESTIONS_FIELD, value);
    },
        
    onSuggestionSelected : function() {
    	var selectedSuggestion = this.getSelectedSuggestion();
        this.setChangeToValue(selectedSuggestion);
    },
    
    // Add Words to Dictionary
    
    setLanguages : function(languages, selectedLanguageCode) {
        var t = this;
        tinymce.each(languages, function(value, name) {
            t.addLanguage(name);
            if (value == selectedLanguageCode) {
            	t.selectLastOptionMenuItem(t.ADD_WORDS_TO_FIELD);
            }
        });
    },
    
    addLanguage : function(language) {
        this.addOption(this.ADD_WORDS_TO_FIELD, language);
    },
    
    getSelectedLanguageName : function() {
        return this.getSelectedOption(this.ADD_WORDS_TO_FIELD);
    },
    
    getSelectedLanguageCode : function() {
        var languageName = this.getSelectedLanguageName();
        return this.getLanguageCode(languageName);
    },
    
    getLanguageCode : function(languageName) {
        return this.plugin.languages[languageName];
    },
    
    onAdd : function() {
    	var t = this;
    	var wordToAdd = this.getCurrentWord();
        this.markWordAsNotMisspelled(wordToAdd);
        this.plugin.learnWord(this.getSelectedLanguageCode(), wordToAdd, function() {
           t.moveToNextMisspelledWord();
        });
    },
    
    getLanguagesField : function() {
        return this.getField(this.ADD_WORDS_TO_FIELD);
    },
    
    // Undo
    
    onUndo : function() {
    	this.unmarkCurrentWord();
    	var undoneWord = UndoManager.getInstance().undo();
    	if (undoneWord) {
    		this.setCurrentWordPosition(undoneWord.getWordPosition());
    	}
    	this.updateMisspelledWord();
    },
    
    // Close
    
    onClose : function() {
    	this.editor.spellcheckCancelled = true;
    	this.spellcheckComplete();
    },
    
    // Utility functions
    
    getSelectedOption : function(id) {
        var field = this.getField(id);
        var selectedIndex = field.selectedIndex;
        var selectedValue = null;
        if (selectedIndex !== null && typeof(selectedIndex) !== "undefined" && selectedIndex >= 0 && selectedIndex < field.length) {
            var selectedOption = field[selectedIndex];
            if (selectedOption) {
                selectedValue = selectedOption.text;
            }
        }
        return selectedValue;
    },
    
    selectLastOptionMenuItem : function(id) {
    	var field = this.getField(id);
    	field.selectedIndex = field.length - 1;
    },
    
    selectOptionMenuItem : function(id, index) {
        var field = this.getField(id);
        field.selectedIndex = index;
    },
    
    addOption : function(id, value) {
        var select = this.getField(id);
        var newOption = document.createElement('option');
        newOption.text = value;
        try {
           select.add(newOption, null);
        }
        catch(e) {
            // ie doesn't support second argument
            select.add(newOption);
        }
    },
    
    clearOptions : function(id) {
    	var select = this.getField(id);
        var selectLength = select.length;
        for(var i = selectLength-1; i >=0 ; i--) {
            select.remove(i);
        }
    },
    
    getField : function(id) {
        var form = document.forms[0];
        return form[id];
    },
    
    getFieldValue : function(id) {
        var field = this.getField(id);
        return field.value;
    },
    
    setFieldValue : function(id, value) {
        var field = this.getField(id);
        field.value = value;
    },
    
    focusOnField : function(id) {
        var field = this.getField(id);
        field.focus();
    },
    
    setAccessKey : function(id, accessKey) {
        var field = this.getField(id);
        this.editor.dom.setAttrib(field, "accesskey", accessKey);
    },
    
    markWordAsNotMisspelled : function(word) {
    	this.misspelledWords[word] = false;
    },
    
    markWordAsMisspelled : function(word) {
        this.misspelledWords[word] = true;
    },
    
    spellcheckComplete : function() {
    	tinyMCEPopup.close();
    },

    onWizardClosed : function() {
    	this.unmarkCurrentWord();
    	if (this.callback) {
    		this.callback.func.call(this.callback.scope, false);
    	}
    	this.editor.focus();
    	this.restoreSelection();
    },
    
    restoreSelection : function() {
    	var ed = this.editor;
    	var se = ed.selection;
        se.collapse();
    }
}

// WordWrapper

var WordWrapper = function(plugin, pointerNode, wordPosition) {
	this.plugin = plugin;
	this.pointerNode = pointerNode;
	this.wordPosition = wordPosition;
	
	this.nodes;
	this.nodesClone;
	this.ignored;
	
	this.reset();
}
	
WordWrapper.prototype.reset = function() {
	var dom = this.plugin.editor.dom;
	var rng = dom.createRng();
	
	this.plugin.findWord(this.pointerNode, rng);
	this.nodes = [];
	this.nodesClone = [];
	var currentContainer = rng.startContainer;
	while (currentContainer != rng.endContainer) {
		if (currentContainer.nodeType == 3) {
			this.nodes.push(currentContainer);
			this.nodesClone.push(currentContainer.cloneNode(false));
		}
		currentContainer = this.plugin.getNextNode(currentContainer);
	}
	this.nodes.push(currentContainer);
	this.nodesClone.push(currentContainer.cloneNode(false));
	this.ignored = false;
}

WordWrapper.prototype.getPointerNode = function() {
	return this.pointerNode;
}

WordWrapper.prototype.getWordPosition = function() {
	return this.wordPosition;
}

WordWrapper.prototype.getNodes = function() {
	return this.nodes;
}

WordWrapper.prototype.ignore = function() {
	this.ignored = true;
}

WordWrapper.prototype.unignore = function() {
	this.ignored = false;
}

WordWrapper.prototype.isIgnored = function() {
	return this.ignored;
}

WordWrapper.prototype.getValue = function() {
	var word = '';
	for (var i = 0; i < this.nodes.length; ++i) {
		word += this.nodes[i].nodeValue;
	}
	return word;
}

WordWrapper.prototype.replace = function(newWord) {
	this.nodes[0].nodeValue = newWord;
	for (var i = 1; i < this.nodes.length; ++i) {
		this.nodes[i].nodeValue = '';
	}
}

WordWrapper.prototype.mark = function() {
	var dom = this.plugin.editor.dom;
	for (var i = 0; i < this.nodes.length; ++i) {
		dom.addClass(this.nodes[i].parentNode, "mceItemHiddenSpellWord");
	}
	this.plugin.editor.selection.collapse(false);
	this.pointerNode.parentNode.scrollIntoView(false);
}

WordWrapper.prototype.unmark = function() {
	var dom = this.plugin.editor.dom;
	for (var i = 0; i < this.nodes.length; ++i) {
		dom.removeClass(this.nodes[i].parentNode, "mceItemHiddenSpellWord");
	}
}

WordWrapper.prototype.rollback = function() {
	for (var i = 0; i < this.nodes.length; ++i) {
		this.nodes[i].nodeValue = this.nodesClone[i].nodeValue;
	}
}

// UndoManager

var UndoManager = function() {
	this.edits = [];
}

UndoManager.instance = null;

UndoManager.getInstance = function() {
    if (!UndoManager.instance) {
        UndoManager.instance = new UndoManager();
    }
    return UndoManager.instance;
}

UndoManager.prototype.onIgnore = function(wordWrapper) {
    var edit = new IgnoreOperation(wordWrapper);
    this.addOperation(edit);
}

UndoManager.prototype.onIgnoreAll = function(wordWrapper, ignoredWordWrappers) {
    var edit = new IgnoreAllOperation(wordWrapper, ignoredWordWrappers);
    this.addOperation(edit);
}

UndoManager.prototype.onChange = function(wordWrapper) {
	var edit = new ChangeOperation(wordWrapper);
	this.addOperation(edit);
}

UndoManager.prototype.onChangeAll = function(wordWrapper, changedWordWrappers) {
	var edit = new ChangeAllOperation(wordWrapper, changedWordWrappers);
	this.addOperation(edit);
}

UndoManager.prototype.addOperation = function(operation) {
	this.edits.push(operation);
}

UndoManager.prototype.undo = function() {
	var undoneWord = null;
    var edit = this.edits.pop();
    if (edit) {
    	edit.undo();
    	undoneWord = edit.getWordWrapper();
    }
    return undoneWord;
}

// UndoOperations

var Operation = function(wordWrapper) {
	this.wordWrapper = wordWrapper;
}

Operation.prototype.undo = function() {
	// edit objects must override this
}

Operation.prototype.getWordWrapper = function() {
    return this.wordWrapper;
}

var IgnoreOperation = function(wordWrapper) {
	Operation.call(this, wordWrapper);
}
IgnoreOperation.prototype = new Operation();

IgnoreOperation.prototype.undo = function() {
	this.wordWrapper.unignore();
}

var IgnoreAllOperation = function(wordWrapper, ignoredWordWrappers) {
    Operation.call(this, wordWrapper);
	this.ignoredWordWrappers = ignoredWordWrappers;
}
IgnoreAllOperation.prototype = new Operation();

IgnoreAllOperation.prototype.undo = function() {
	for(var i = this.ignoredWordWrappers.length - 1; i >= 0; i--) {
    	this.ignoredWordWrappers[i].unignore();
    }
}

var ChangeOperation = function(wordWrapper) {
	Operation.call(this, wordWrapper);
}
ChangeOperation.prototype = new Operation();

ChangeOperation.prototype.undo = function() {
	this.wordWrapper.rollback();
}

var ChangeAllOperation = function(wordWrapper, changedWordWrappers) {
	Operation.call(this, wordWrapper);
	this.changedWordWrappers = changedWordWrappers;
}
ChangeAllOperation.prototype = new Operation();

ChangeAllOperation.prototype.undo = function() {
    for(var i = this.changedWordWrappers.length - 1; i >= 0; i--) {
    	this.changedWordWrappers[i].rollback();
    }
}

tinyMCEPopup.onInit.add(SpellcheckWizard.init, SpellcheckWizard);

tinyMCEPopup.oldClose = tinyMCEPopup.close; // preserve old close function
tinyMCEPopup.close = function() {
    if (typeof tinyMCEPopup.onclose == "function") {
        tinyMCEPopup.onclose(); // execute onclose function if there is any
    }
    tinyMCEPopup.oldClose(); // close popup
}

tinyMCEPopup.onclose = function () {
    SpellcheckWizard.onWizardClosed();
}