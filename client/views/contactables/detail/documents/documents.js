var addDisabled = new ReactiveVar(false);
AddForm = {
    val: false,
    dep: new Deps.Dependency,
    show: function (file) {
        document.file = file;
        document.originalFileName = document.file.name;
        document.name.value = document.file.name;
        this.val = true;
        this.dep.changed();
    },
    hide: function () {
        this.val = false;
        this.dep.changed();
    }
};

Object.defineProperty(AddForm, "value", {
    get: function () {
        this.dep.depend();
        return this.val;
    }
});

var startParsing = function () {
    $('#parsing')[0].style.display = 'block';
};

var endParsing = function () {
    $('#parsing')[0].style.display = 'none';
};


// Add document panel
Template.contactableDocumentsAdd.helpers({
    addForm: function () {
        return AddForm.value;
    },

    showAddForm: function () {
        return function (file) {
            AddForm.show(file);
        };
    }
});

Template.contactableDocumentsAdd.events = {
    'click .add-trigger': function () {
        $('#add-file').trigger('click');
    },
    'change #add-file': function (e) {
        AddForm.show(e.target.files[0]);
    }
};

// Add document form

var document = new Utils.ObjectDefinition({
    reactiveProps: {
        name: {
            validator: function () {
                return this.value != '';
            }
        },
        description: {},
        tags: {
            type: Utils.ReactivePropertyTypes.array
        }
    },
    originalFileName: {},
    file: {}
});

Template.addDocumentForm.helpers({
    newDocument: function () {
        return document;
    },
    addDisabled: function () {
        return addDisabled.get() ? 'disabled':'';
    }
});

Template.addDocumentForm.events = {
    'click #add-tag': function (e) {
        var inputTag = $('#new-tag')[0];
        if (!inputTag.value || _.indexOf(document.tags.value, inputTag.value) != -1)
            return;

        document.tags.insert(inputTag.value);
        inputTag.value = '';
        inputTag.focus();
    },
    'click #remove-tag': function () {
        console.log('remove tag: ' + this.value);
        document.tags.remove(this.value);
    },
    'click #save-document': function () {
        addDisabled.set(true);
        if (!document.isValid()) {
            document.showErrors();
            addDisabled.set(false);
            return;
        }

        var newDocument = document.getObject();

        // Get extension
        var extension;
        var splitName = document.file.name.split('.');
        if (splitName.length > 1)
            extension = splitName[splitName.length - 1];

        var metadata = {
            entityId: Session.get('entityId'),
            name: newDocument.name,
            type: newDocument.file.type,
            extension: extension,
            description: newDocument.description,
            tags: newDocument.tags,
            owner: Meteor.userId()
        };

        startParsing();
        FileUploader.post('uploadContactablesFiles', newDocument.file, metadata, function (err, result) {
            if (!err) {
                endParsing();
                AddForm.hide();
                document.reset();
                addDisabled.set(false);

            }
            else {
                alert('File upload error:' + err)
                console.log('File upload error');
                addDisabled.set(false);
            }
        });
    },
    'click #cancel-document': function () {
        AddForm.hide();
        document.reset();
    }
};

// List documents
var documentsDep = new Deps.Dependency;
var documentsCount = 0;

var DocumentsHandler;
var queryDep = new Deps.Dependency;

var query = new Utils.ObjectDefinition({
    reactiveProps: {
        searchString: {}
    }
});

Template.contactableDocumentsList.created = function() {
    Meteor.autorun(function() {

        queryDep.depend();
        if(DocumentsHandler) {
            DocumentsHandler.setFilter({
                name: {
                    $regex: query.searchString.value,
                    $options: 'i'
                }
            });
        } else {
            SubscriptionHandlers.DocumentsHandler = DocumentsHandler = Meteor.paginatedSubscribe('contactablesDocs', {
                pubArguments: Session.get('entityId'),
                filter: {
                    name: {
                        $regex: query.searchString.value,
                        $options: 'i'
                    }
                }
            });
        }
    });
}

Template.contactableDocumentsList.helpers({
    documents: function () {
        if (!this.entity)
            return;

        documents = ContactablesFiles.find({
            entityId: this.entity._id,
            name: {
                $regex: query.searchString.value,
                $options: 'i'
            }
        }, {
            sort: {
                'dateCreated': -1
            }
        });

        documentsCount = documents.count();
        documentsCount += Resumes.find({employeeId: this.entity._id}).count();
        documentsDep.changed();

        return documents;
    },

    isEmpty: function () {
        documentsDep.depend();
        return documentsCount == 0;
    },

    resumes: function () {
        var resumes = Resumes.find({employeeId: this.entity._id});
        return resumes && resumes.count() > 0 ? resumes : undefined;
    },


    url: function () {
        return FileUploader.getUrl('uploadContactablesFiles', this.fileId);
    },

    resumeUrl: function () {
        return FileUploader.getUrl('uploadResume', this.resumeId);
    },

    documentIcon: function (type) {
        switch (true) {
            case /application\/zip/.test(type):
                return 'fa fa-file-archive-o';
            case /image\//.test(type):
                return 'icon-file-image-1';
            case /text\/css/.test(type):
                return 'icon-file-code';
            case /application\/pdf/.test(type):
                return 'fa fa-file-pdf-o';
            case /application\/msword/.test(type):
                return 'fa fa-file-word-o';
            case /application\/msexcel/.test(type) || /application\/vnd.ms-excel/.test(type) || /application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet/.test(type):
                return 'fa fa-file-excel-o';
            default:
                return 'fa fa-file-o';
        }
    },

    documentIconBackground: function(type) {
        switch (true) {
            case /application\/pdf/.test(type):
                return 'item-icon-pdf';
            case /application\/msword/.test(type):
                return 'item-icon-word';
            case /application\/msexcel/.test(type) || /application\/vnd.ms-excel/.test(type) || /application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet/.test(type):
                return 'item-icon-excel';
            default:
                return 'item-icon-file';
        }
    },
    query: function () {
        return query;
    }
});

Template.contactableDocumentsList.events = {
    'click .delete': function (e) {
        var file = this;
        if (Utils.bUserIsAdmin()) {
            if (confirm('Delete file' + this.name + '?')) {
                ContactablesFiles.remove({_id: file._id});
            }
        }
    },
    'click .delete-resume': function (e) {
        var file = this;
        if (Utils.bUserIsAdmin()) {
            if (confirm('Delete file' + this.name + '?')) {
                Resumes.remove({_id: file._id});
            }
        }
    },
    'click .resume': function (e) {
        var file = this;
        FS.HTTP.uploadQueue.resumeUploadingFile(file);
    },
    'click .cancel': function (e) {
        var file = this;
        ContactablesFiles.remove({_id: file._id});
    },
    'click .add-document-trigger': function () {
        $('#add-file').trigger('click');
    },
    'keyup #searchString': _.debounce(function(e){
        query.searchString.value = e.target.value;
    })
};

Template.contactableDocumentsList.onDestroyed(function () {
  SubscriptionHandlers.DocumentsHandler.stop();
  DocumentsHandler = undefined;
});
