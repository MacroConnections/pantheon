# @ is used to place collections in the global namespace
# These exist on both the CLIENT and SERVER

# Fundamental Collections
@Countries = new Meteor.Collection "countries"
@Domains = new Meteor.Collection "domains"
@People = new Meteor.Collection "people"

@SeoCollection = new Meteor.Collection "SeoCollection"

