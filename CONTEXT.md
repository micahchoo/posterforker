# PosterForker

A Maker copies a repository on GitHub, adds large Images and the Scenes about them,
and GitHub publishes a guided Tour of each Image. The Maker never installs anything.

## Language

### What a Maker publishes

**Image**:
One large picture that a Tour is about. The same picture may back several Tours.
_Avoid_: poster, artwork, object, media

**Scene**:
One region of an Image plus the words about it.
_Avoid_: story, chapter, stop, annotation, hotspot

**Tour**:
An ordered set of Scenes over exactly one Image.
_Avoid_: story, exhibit, narrative, project, reading

**Collection**:
The ordered set of Tours one repository publishes together; a Reader moves through
it one Tour at a time. A repository with one Tour is a Collection of one.
_Avoid_: gallery, exhibition, site, repo

### Who

**Maker**:
The person who builds and publishes a Collection.
_Avoid_: author, curator, owner, user

**Reader**:
The person who looks at a published Collection.
_Avoid_: viewer, visitor, user

### How it looks

**Theme**:
The look of a Collection: colours, fonts, shapes, motion. One per Collection; a Tour
may override it.
_Avoid_: skin, style, template

**Module**:
One piece of the Reader's interface, such as the Scene list or the share button.
_Avoid_: plugin, widget, component, control

**Slot**:
A named place in the Reader's interface where a Module sits.
_Avoid_: region, zone, area

## Notes

"PosterForker" is the product's name, not a term. Inside the product, the picture is
an **Image**.
