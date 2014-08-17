
var generateReactiveObject = function(job) {
  return new dType.objInstance(job, Jobs);
};

var self={};
Utils.reactiveProp(self, 'editMode', false);
var location={};
Utils.reactiveProp(location, 'value', null);
var services;

Template.jobDetail.created=function(){
  self.editMode=false;
  var originalJob=Jobs.findOne({ _id: Session.get('entityId') });


  var definition={
    reactiveProps:{
      tags:{
        default: originalJob.tags,
        update: 'tags',
        type: Utils.ReactivePropertyTypes.array
      }
    }
  };
  services= Utils.ObjectDefinition(definition);
}
var job;
Template.jobDetail.helpers({
  job: function(){
    var originalJob=Jobs.findOne({ _id: Session.get('entityId') });
    Session.set('jobDisplayName', originalJob.displayName);
    if (!job)
      job = generateReactiveObject(originalJob);
    return job;
  },
  originalJob:function(){
    return Jobs.findOne({ _id: Session.get('entityId') });
  },
  editMode:function(){
    return self.editMode;
  },
  colorEdit:function(){
    return self.editMode ? '#008DFC' : '#ddd'
  },
  isType:function(typeName){
    return !! Jobs.findOne({ _id: Session.get('entityId'), objNameArray: typeName});
  },
  jobCollection: function(){
    return Jobs;
  },

  isSelected:function(optionValue, currentValue){
    return optionValue == currentValue;
  },
  location: function(){
    var originalJob=Jobs.findOne({ _id: Session.get('entityId') });

    location.value= originalJob && originalJob.location;
    return location;
  },
  tags: function(){
    return services.tags;
  }
});

Template.jobDetail.events({
  'click .editJob':function(){
    self.editMode= ! self.editMode;
  },
  'click .saveButton':function(){
    if (!job.validate()) {
      job.showErrors();
      return;
    }
    var update=job.getUpdate();
    var originalJob=Jobs.findOne({ _id: Session.get('entityId') });
    var oldLocation= originalJob.location;
    var newLocation= location.value;

    if ((newLocation && newLocation.displayName) != (oldLocation && oldLocation.displayName)){
      update.$set= update.$set || {};
      update.$set.location= newLocation;
    }

    if (services.tags.value.length > 0)
      update.$set.tags = services.tags.value;

    Jobs.update({_id: job._id}, update, function(err, result) {
      if (!err) {
        self.editMode=false;
        job.reset();
      }
    });
  },
  'click .cancelButton':function(){
    self.editMode=false;
  },
  'click .add-tag': function() {
    addTag();
  },
  'keypress #new-tag': function(e) {
    if (e.keyCode == 13) {
      e.preventDefault();
      addTag();
    }
  },
  'click .remove-tag': function() {
    services.tags.remove(this.value);
  }
});

var addTag = function() {
  var inputTag = $('#new-tag')[0];

  if (!inputTag.value)
    return;

  if (_.indexOf(services.tags.value, inputTag.value) != -1)
    return;
  services.tags.insert(inputTag.value);
  inputTag.value = '';
  inputTag.focus();
};

Template.jobDetail.helpers({
  getType: function(){
    return Enums.linkTypes.job;
  }
});


