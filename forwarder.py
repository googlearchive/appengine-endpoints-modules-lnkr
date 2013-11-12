import cgi
import urllib
import logging

import webapp2
import re

import utils

from google.appengine.api import memcache
from google.appengine.ext import ndb
from google.appengine.ext import deferred

from model import ShortLink

class RequestForwarder(webapp2.RequestHandler):
  """ Redirect a short link to its destination. """

  def get(self):
    """ A GET request, the result of which is a redirection or 404.

    The flow is as follows
    1) Extract the short link and other parts of the request url
    2) Look up the short link in datastore
    3) If found, redirect to that url, adding the other parts from the request
    4) If not found, return 404

    By way of example: if the request is http://blah/AbCXyZ/a=1&b=2, and the
    target url is https://foo/somepath, then the redirect will be to
    https://foo/somepath/a=1&b=2
    """
    m = re.match(r'^https?://[^/]+/([^/?]+)(.*)$', self.request.url)
    if m:
      short_url = m.group(1)
      extras = m.group(2)

      # Check memcache first
      red_url = memcache.get(short_url)
      if red_url is not None:
        logging.info('Cache hit for short URL [%s], redirecting to [%s]' %
                     (short_url, red_url + extras))
        red_url = red_url + extras
        deferred.defer(utils.updateMetric, 'use-cached',
                       self.request.headers['X-AppEngine-Country'])
        self.redirect(red_url)
      else:
        # If not in memcache, read from datastore and store in memcache
        logging.info('Cache miss for short URL [%s], querying datastore' %
                     (short_url))
        results = ShortLink.query(ShortLink.short_link == short_url).fetch(1)
        if len(results) == 0:
          self.error(404)
        else:
          red_url = results[0].target_link + extras
          memcache.add(short_url, str(results[0].target_link))
          logging.info('Added short URL [%s], to cache with value [%s]' %
                     (short_url, red_url))
          deferred.defer(utils.updateMetric, 'use-notcached',
                         self.request.headers['X-AppEngine-Country'])
          self.redirect(str(red_url))
    else:
      self.error(404)


app = webapp2.WSGIApplication([
  ('/.*', RequestForwarder)
], debug = True)
