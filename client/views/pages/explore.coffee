# Re-render visualization template on window resize
Template.visualization.resize = ->
  if Session.get "resize"
    console.log "RESIZING"
    return

# Render SVGs and ranked list based on current vizMode
Template.visualization.render_template = ->
  type = Session.get "vizType"
  switch type
    when "treemap" then new Handlebars.SafeString(Template.treemap(this))
    when "matrix" then new Handlebars.SafeString(Template.matrix(this))
    when "scatterplot" then new Handlebars.SafeString(Template.scatterplot(this))
    when "map" then new Handlebars.SafeString(Template.map(this))
    when "histogram" then new Handlebars.SafeString(Template.histogram(this))
    when "stacked" then new Handlebars.SafeString(Template.stacked(this))

Template.time_slider.rendered = ->
  # Not sure why this works, but it overcomes the re-styling issue
  $("div#from > select, div#to > select").selectToUISlider
    labels: 15
    tooltip: false

Template.accordion.rendered = ->
  mapping = 
    treemap: 0
    matrix: 1
    scatterplot: 2
    map: 3
    histogram: 4
    stacked: 5

  accordion = $(".accordion")
  accordion.accordion
    active: mapping[Session.get("vizType")]
    collapsible: false
    heightStyle: "content"
    fillSpace: false
  # accordion.accordion "resize"

Template.accordion.country_treemap_active = -> if Session.equals("vizMode", "country_exports") then "active" else ""
Template.accordion.domain_treemap_active = -> if Session.equals("vizMode", "domain_exports_to") then "active" else ""
Template.accordion.matrix_active = -> if Session.equals("vizMode", "matrix_exports") then "active" else ""
Template.accordion.cvc_active = -> if Session.equals("vizMode", "country_vs_country") then "active" else ""
Template.accordion.dvd_active = -> if Session.equals("vizMode", "domain_vs_domain") then "active" else ""
Template.accordion.map_active = -> if Session.equals("vizMode", "map") then "active" else ""

Template.accordion.events = 
  "click li a": (d) ->
    culturalDomains = ['ARTS', 'HUMANITIES', 'BUSINESS & LAW', 'EXPLORATION', 'INSTITUTIONS', 'PUBLIC FIGURE', 'SCIENCE & TECHNOLOGY', 'SPORTS']
    srcE = (if d.srcElement then d.srcElement else d.target)
    vizType = $(srcE).data "viz-type"
    vizMode = $(srcE).data "viz-mode"
    # Parameters depend on vizMode (e.g countries -> languages for exports)
    [paramOne, paramTwo] = IOMapping[vizMode]["in"]
    unless paramOne is "all"
      paramOne = Session.get(paramOne)
    unless paramTwo is "all"
      paramTwo = Session.get(paramTwo)
    if vizMode in ["domain_exports_to","map"] # to randomize the domain when you click on domains
      paramOne = getRandomFromArray(culturalDomains)

    # Use session variables as parameters for a viz type change
    Router.go "explore",
      vizType: vizType
      vizMode: vizMode
      paramOne: paramOne
      paramTwo: paramTwo
      from: Session.get("from")
      to: Session.get("to")
      langs: Session.get("langs")
      gender: Session.get("gender")
      dataset: Session.get("dataset")

# Global helper for data ready
Handlebars.registerHelper "dataReady", ->
  Session.get "dataReady"

Handlebars.registerHelper "initialDataReady", ->
  Session.get "initialDataReady"

Handlebars.registerHelper "tooltipDataReady", ->
  Session.get "tooltipDataReady"

# Create a global helper
# Use this from multiple templates
Handlebars.registerHelper "person_lookup", ->
  People.findOne @_id

Template.ranked_list.top10 = ->
  if Session.get("indexType") is "HPI" then order = {HPI:-1}
  else order = {numlangs:-1}
  console.log(order)
  PeopleTopN.find({}, {sort:order})

Template.ranked_list.empty = ->
  PeopleTopN.find().count() is 0

Template.ranked_person.birthday = ->
  birthday = (if (@birthyear < 0) then (@birthyear * -1) + " B.C." else @birthyear)
  birthday

Template.ranked_person.index = ->
  if Session.get("indexType") is "HPI" and Session.get("dataset") is "OGC" then @HPI.toFixed(2) else @numlangs

Template.date_header.helpers
  from: ->
    from = Session.get("from")
    return "1 A.D."  if from is "1"
    (if (from < 0) then (from * -1) + " B.C." else from)

  to: ->
    to = Session.get("to")
    return "1 A.D."  if to is "1"
    (if (to < 0) then (to * -1) + " B.C." else to)

# Generate question given viz type
Template.question.question = -> 
  dataset = Session.get("dataset")
  console.log dataset, Session.get("country")
  try
    country = if Session.get("country") is "all" then "the world" else Countries.findOne({countryCode: Session.get("country"), dataset: dataset}).countryName
    countryX = if Session.get("countryX") is "all" then "the world" else Countries.findOne({countryCode: Session.get("countryX"), dataset: dataset}).countryName
    countryY = if Session.get("countryY") is "all" then "the world" else Countries.findOne({countryCode: Session.get("countryY"), dataset: dataset}).countryName
  vars = 
    country: country
    countryX: countryX
    countryY: countryY
    category: if Session.get("category") is "all" then "all domains" else Session.get("category").capitalize()
    categoryX: if Session.get("categoryX") is "all" then "all domains" else Session.get("categoryX").capitalize()
    categoryY: if Session.get("categoryY") is "all" then "all domains" else Session.get("categoryY").capitalize()
    gender_var: Session.get("gender")
    categoryLevel: Session.get("categoryLevel")
  mode = Session.get("vizMode")
  getQuestion(mode, vars)

@boldify = (str) -> "<b>" + str + "</b>"
@getQuestion = (mode, vars) ->
  console.log mode, vars
  # If mode requires a category, switch based on categoryLevel because occupations are singular
  if mode in ["domain_exports_to", "map", "domain_vs_domain"]
    # Default to empty
    category_prefix = ""
    unless vars.category is "all domains"
      switch vars.categoryLevel
        when "domain", "industry" then category_prefix = " individuals in "
        when "occupation"
          if vars.category is "Martial Arts" then vars.category = "Martial Artists" else vars.category = vars.category + "s"
    else category_prefix = " individuals in "

  # If mode requires gender, then change subject
  if mode in ["matrix_exports"]
      switch vars.gender_var
        when "both" then vars.gender_var = "men and women"
        when "male" then vars.gender_var = "men"
        when "female" then vars.gender_var = "women"

  # Actually construct the question
  switch mode
    when "country_exports" then return new Handlebars.SafeString("Who are the globally known people born in " + boldify(vars.country) + "?")
    when "domain_exports_to", "map" then return new Handlebars.SafeString("Where were globally known " + category_prefix + boldify(vars.category) + " born?")
    when "matrix_exports"
      if vars.gender_var is "ratio" then return new Handlebars.SafeString("What's the " + boldify("female to male") + " ratio for each country and cultural domain?")
      else return new Handlebars.SafeString("How many globally known " + boldify(vars.gender_var) + " are associated with each country and cultural domain?")
    when "country_vs_country" then return new Handlebars.SafeString("How does " + boldify(vars.countryX) + " and " + boldify(vars.countryY) + " compare in terms of number of globally known people?")
    when "domain_vs_domain" then return new Handlebars.SafeString("What countries have produced globally known people in " + boldify(vars.categoryX) + " and " + boldify(vars.categoryY))
#
# TOOLTIPS
# 
Template.tooltip.helpers
  tooltipShown: -> (Session.get("showTooltip") and not Session.get("clicktooltip"))

  position: -> Session.get "tooltipPosition"

  top5: -> # Total count is also passed
    if Session.get("indexType") is "HPI" then order = {HPI:-1}
    else order = {numlangs:-1}
    Tooltips.find({_id:{$not: "count"}}, {sort:order})

  count: ->
    doc = Tooltips.findOne(_id: "count")
    (if (typeof doc isnt "undefined") then doc.count else 0)

  suffix: ->
    doc = Tooltips.findOne(_id: "count")
    (if (typeof doc isnt "undefined" and doc.count > 1) then "individuals" else "individual")

  more: ->
    doc = Tooltips.findOne(_id: "count")
    (if (typeof doc isnt "undefined") then doc.count > 5 else false)

  extras: ->
    doc = Tooltips.findOne(_id: "count")
    (if (typeof doc isnt "undefined") then doc.count - 5 else 0)

Template.tt_person.birthday = ->
  birthday = (if (@birthyear < 0) then (@birthyear * -1) + " B.C." else @birthyear)
  birthday

Template.tt_person.index = ->
  if Session.get("indexType") is "HPI" and Session.get("dataset") is "OGC" then @HPI.toFixed(2) else @numlangs

Template.clicktooltip.helpers
  showclicktooltip: ->
    Session.get "clicktooltip"
  categoryName : ->
    Session.get("bigtooltipCategory").capitalize()
  category : ->
    Session.get("bigtooltipCategory")
  from : ->
    Session.get("from")
  to : ->
    Session.get("to")
  L : ->
    Session.get("langs")
  dataset : ->
    Session.get("dataset")
  count: ->
    doc = Tooltips.findOne(_id: "count")
    (if (typeof doc isnt "undefined") then doc.count else 0)

Template.clicktooltip.render_links = ->
  vizType = Session.get("vizType")
  vizMode = Session.get("vizMode")
  switch vizType
    when "treemap", "scatterplot"
      if vizMode in ["country_exports", "country_vs_country"]
        return new Handlebars.SafeString(Template.tt_treemap_country_exports(this))
      else if vizMode in ["domain_exports_to", "domain_vs_domain"]
        return new Handlebars.SafeString(Template.tt_treemap_domain_exports_to(this))
    when "matrix","map"
      return new Handlebars.SafeString(Template.tt_global_exports(this))
    when "histogram"
      if vizMode is "country_exports"
        return new Handlebars.SafeString(Template.tt_histogram_country_exports(this))
      else if vizMode is "domain_exports_to"
        return new Handlebars.SafeString(Template.tt_histogram_domain_exports_to(this))

Template.domain_exporter_question.question = -> 
  category = Session.get("bigtooltipCategory")
  categoryLevel = getCategoryLevel(category)
  if category is "all" then category = "all domains" else category = category.capitalize()
  getQuestion("domain_exports_to", {category: category, categoryLevel: categoryLevel})
Template.country_exports_question.question = -> 
  countryCode = Session.get("tooltipCountryCode")
  dataset = Session.get("dataset")
  vizMode = Session.get("vizMode")
  if vizMode is "map" and dataset is "murray"
    country = (Countries.findOne({countryCode3: countryCode}).countryName).capitalize()
  else 
    country = (Countries.findOne({countryCode: countryCode, dataset: dataset}).countryName).capitalize() 
  console.log "in helper: country_exports". country
  getQuestion("country_exports", {country: country})

Template.country_advantage_question.countryName = ->
  countryCode = Session.get("tooltipCountryCode")
  return (Countries.findOne({$or: [{countryCode: countryCode}, {countryCode3: countryCode}]}).countryName).capitalize()

Template.domain_advantage_question.categoryName = ->
  Session.get("bigtooltipCategory").capitalize()

Template.treemap_domain_exports_to.helpers
  category : -> Session.get("bigtooltipCategory")
  from : -> Session.get("from")
  to : -> Session.get("to")
  L : -> Session.get("langs")
  dataset : -> Session.get("dataset")

Template.treemap_country_exports.helpers
  country : -> 
    dataset = Session.get("dataset")
    vizMode = Session.get("vizMode")
    countryCode = Session.get("bigtooltipCountryCode")
    if vizMode is "map" and dataset is "murray"
      return Countries.findOne({countryCode3: countryCode}).countryCode
    else
      return countryCode
  from : -> Session.get("from")
  to : -> Session.get("to")
  L : -> Session.get("langs")
  dataset : -> Session.get("dataset")

Template.map_global_exports.helpers
  category : -> Session.get("bigtooltipCategory")
  from : -> Session.get("from")
  to : -> Session.get("to")
  L : -> Session.get("langs")
  dataset : -> Session.get("dataset")

Template.histogram_domain_exports_to.helpers
  category : -> Session.get("bigtooltipCategory")
  from : -> Session.get("from")
  to : -> Session.get("to")
  L : -> Session.get("langs")
  dataset : -> Session.get("dataset")

Template.histogram_country_exports.helpers
  country : -> Session.get("bigtooltipCountryCode")
  from : -> Session.get("from")
  to : -> Session.get("to")
  L : -> Session.get("langs")
  dataset : -> Session.get("dataset")

Template.clicktooltip.events =
  # TODO Ensure this works for tap
  "click .d3plus_tooltip_close,.d3plus_tooltip_curtain": (d) ->
    Session.set "clicktooltip", false
  "click .closeclicktooltip": (d) ->
    Session.set "clicktooltip", false
