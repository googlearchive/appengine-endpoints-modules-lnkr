from google.appengine.ext import ndb

from model import MetricCounter
import datetime
import time


@ndb.transactional
def incrementCounter(key):
  obj = key.get()
  obj.value += 1
  obj.put()

def updateMetric(event_type, user_country):
  current_day = datetime.date.today()
  current_timestamp = int(time.mktime(current_day.timetuple())*1000)

  q = MetricCounter.gql('WHERE name = :1 AND day = :2 and country = :3',
                        event_type,
                        current_timestamp,
                        user_country)
  metric = q.get()
  if metric is None:
    metric = MetricCounter(name = event_type, value = 1, day = current_timestamp,
                           country = user_country)
    metric.put()
  else:
    incrementCounter(metric.key)
