import cgi
import urllib
import logging

import webapp2
import re
import json

import utils

from google.appengine.api import memcache
from google.appengine.ext import ndb
from google.appengine.ext import deferred
from google.appengine.ext.ndb import stats

from model import MetricCounter

class DataRequest(webapp2.RequestHandler):
  """ Redirect a short link to its destination. """

  def get(self):
    """ A GET request, the result of which is a JSON object containing data.
    """
    m = re.match(r'^https?://[^/]+/data/(.*)$', self.request.url)
    if m:
      action = m.group(1)
      self.response.headers['Content-Type'] = 'application/json'

      if action == 'creation':
        json_data = self.retrieve_data_creation()
        self.response.out.write(json.dumps(json_data))
      elif action == 'use':
        json_data = self.retrieve_data_use()
        self.response.out.write(json.dumps(json_data))
      elif action == 'linkspace':
        json_data = self.retrieve_data_linkspace()
        self.response.out.write(json.dumps(json_data))
      else:
        self.response.out.write(json.dumps({}))
    else:
      logging.info('no action found in ' + self.request.url)
      self.error(404)

  def retrieve_data_creation(self):
    # Check memcache first
    data = memcache.get('stats-data-creation')
    if data is not None:
      return data
    else:
      # If not in memcache, read from datastore and store in memcache
      results = MetricCounter.query(MetricCounter.name == 'create').fetch()
      if len(results) == 0:
        return {}
      else:
        data_obj = {}
        data_obj['data'] = []
        data_obj['data'].append(['country', 'count', 'day'])
        for metric in results:
          create_obj = []
          create_obj.append(metric.country)
          create_obj.append(metric.value)
          create_obj.append(metric.day)
          data_obj['data'].append(create_obj)

        memcache.add('stats-data-creation', data_obj)
        return data_obj

  def retrieve_data_use(self):
    # Check memcache first
    data = memcache.get('stats-data-use')
    if data is not None:
      return data
    else:
      # If not in memcache, read from datastore and store in memcache
      results = MetricCounter.query(MetricCounter.name.IN(['use-cached',
                                                          'use-notcached'])).fetch()
      if len(results) == 0:
        return {}
      else:
        data_obj = {}
        data_obj['data'] = []
        data_obj['data'].append(['country', 'count-notcached', 'count-cached'])
        tmp_obj = {}
        for metric in results:
          if not tmp_obj.has_key(metric.country):
            tmp_obj[metric.country] = {}
          tmp_obj[metric.country][metric.name] = metric.value

        for key, value in tmp_obj.iteritems():
          usenot = 0
          usecached = 0
          if 'use-notcached' in value:
            usenot = value['use-notcached']
          if 'use-cached' in value:
            usecached = value['use-cached']

          data_obj['data'].append([key, usenot, usecached])

        memcache.add('stats-data-use', data_obj)
        return data_obj

  def retrieve_data_linkspace(self):
    # Check memcache first
    data = memcache.get('stats-linkspace')
    if data is not None:
      return data
    else:
      ds_stats = stats.KindStat.query(stats.KindStat.kind_name == 'ShortLink').get()
      data_obj = {}
      data_obj['data'] = []
      if ds_stats:
        data_obj['data'].append(['used', 'total', 'data_bytes'])
        data_obj['data'].append([ds_stats.count, 63**6, ds_stats.entity_bytes])

      return data_obj

app = webapp2.WSGIApplication([
  ('/data.*', DataRequest)
], debug = True)
