import cgi
import urllib
import logging

import webapp2

from google.appengine.ext import ndb

class ShortLink(ndb.Model):
  """Models a short URL: short link, target, date created."""
  short_link = ndb.StringProperty()
  created_date = ndb.IntegerProperty()
  target_link = ndb.StringProperty()


class MetricCounter(ndb.Model):
  """A metric."""
  name = ndb.StringProperty()
  country = ndb.StringProperty()
  value = ndb.IntegerProperty()
  day = ndb.IntegerProperty()

