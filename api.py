import logging
import re
import random
import os
import time

from google.appengine.ext import ndb
from google.appengine.ext import endpoints
from google.appengine.ext import deferred
from google.appengine.api import memcache
from protorpc import remote

from model import ShortLink
import api_messages
import utils
from api_messages import CreateShortLinkMessageRequest
from api_messages import CreateShortLinkMessageResponse
from api_messages import ListShortLinkMessageRequest
from api_messages import ShortLinkMessage
from api_messages import ListShortLinkMessageResponse
from api_messages import ReadShortLinkMessageRequest
from api_messages import ReadShortLinkMessageResponse
from api_messages import DeleteShortLinkMessageRequest
from api_messages import DeleteShortLinkMessageResponse

NUM_SHARDS = 20
SHARD_KEY_TEMPLATE = 'shard-{}-{:d}'

@endpoints.api(name='shortlink', version='v1', description='Short Link API',
               owner_domain="lnkr.co.za", owner_name="lnkr",
               package_path="android")
class ShortLinkApi(remote.Service):
  """ This is the API for managing short links. """

  def ValidateInput(self, request):
    """ Validate the input for a short link creation request.
    Args:
      request: the request to create a short link.

    Returns:
      A list of validation errors which is empty if there are no errors.
    """

    disallowed_custom = [ 'index.html', 'js', 'style', 'about.html', 'api.html',
                        'stats.html', 'data', 'favicon', 'robots' ];
    validation_errors = []
    if request.short_link:
      if not re.search(r'^[a-zA-Z0-9-.]+$', request.short_link):
        validation_errors.append(('Short links can only be alpha-numeric '
                                  'characters, numbers or . or -'))

      if request.short_link in disallowed_custom:
        validation_errors.append('That short link is already in use.')

      if len(request.short_link) < 3:
        validation_errors.append('Custom short links must be longer than 3 characters')

    if (not request.target_link) or len(request.target_link) == 0:
      validation_errors.append('Please provide a target URL')
    else:
      if not re.search(r'^https?://', request.target_link):
        validation_errors.append('The target URL provided is invalid - only http or https allowed.')

    return validation_errors

  def GenerateShortLinkCode(self, num_links):
    """ Generate a short link code.

    This generates the short link code (i.e. the XyZAbC part in
    http://blah/XyZAbC. The idea came from http://en.wikipedia.org/wiki/Base_36
    Generate more than one at a time in case a link is already taken.

    Args:
      num_links: the number of short links to generate at once.
    Returns:
      A list of short link codes.
    """
    desired_length = 6
    alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-'

    result = []
    for i in range(num_links):
      base = []
      for i in range(desired_length):
        pos = random.randrange(0, len(alphabet), 1)
        base.append(alphabet[pos])
      result.append(''.join(base))
    return result

  @endpoints.method(CreateShortLinkMessageRequest,
                    CreateShortLinkMessageResponse, name='create',
                    path= '/create', http_method = 'POST')
  def CreateShortLink(self, request):
    """ The API endpoint for creating a short link.

    Args:
      request: the API request to create a short link.
    Returns:
      A message containing either a status code, the short link created and a
      message.

    Creates a short link and stores it in datastore. The flow is
    1) validate the input
    2) for user-chosen short links, check if the short link exists already
    3) generate n short links
    3a) if all n short links are already taken, try again, if still all are
    taken, give up
    3b) of the short links still available, choose one at random
    4) write the data to datastore
    """
    chosen_link = ''

    # Validate input
    validation_errors = self.ValidateInput(request)
    if len(validation_errors) > 0:
      logging.info('Validation errors: %s' % (', '.join(validation_errors)))
      return CreateShortLinkMessageResponse(status = 1, msg = validation_errors)

    # Check if the short link already exists (for a custom short link)
    if request.short_link:
      query = ShortLink.query(ShortLink.short_link == request.short_link)
      results = query.fetch(1)
      if len(results) == 1:
        return CreateShortLinkMessageResponse(status = 1,
                                              msg = [('Sorry, the short link '
                                                      'you requested is already'
                                                      ' taken')])
    else:
      # Generate a short link if a custom one wasn't requested
      gen_links = self.GenerateShortLinkCode(10)
      query = ShortLink.query(ShortLink.short_link.IN(gen_links))
      results = query.fetch(len(gen_links))

      logging.info('Found %d collisions!' % (len(results)))
      if len(results) == len(gen_links):
        # oh dear, all of our generated links already exists.
        logging.info('  Wow, all are taken!')
        gen_links = self.GenerateShortLinkCode(10)
        query = ShortLink.query(ShortLink.short_link.IN(gen_links))
        results = query.fetch(len(gen_links))

        if len(results) == len(gen_links):
          logging.info('  Wow, all of the backup ones are taken too, I give up!')
          # I give up
          return CreateShortLinkMessageResponse(status = 1,
                                              msg = [('Sorry, the short link '
                                                      'you requested is already'
                                                      'taken. I really did try'
                                                      ', Jim, but we just '
                                                      'don\'t have the '
                                                      'entropy!')])
        else:
          taken = set()
          for r in results:
            taken.add(r.short_link)
          available = set(gen_links) - taken
          chosen_link = list(available)[random.randrange(0, len(available))]
          logging.info('  On second attempt, found %d available so now chose %s'
                       % (len(available), chosen_link))
      else:
        taken = set()
        for r in results:
          taken.add(r.short_link)
        available = set(gen_links) - taken
        chosen_link = list(available)[random.randrange(0, len(available))]
        logging.info('  On first attempt, found %d available so now chose %s'
                     % (len(available), chosen_link))

    short_link_in = request.short_link or chosen_link

    # Choose a shard for the new entity.
    # Details of this approach are here:
    # https://developers.google.com/appengine/articles/sharding_counters
    parent_index = random.randint(0, NUM_SHARDS - 1)
    parent_key_string = SHARD_KEY_TEMPLATE.format('ShortlinkParent',
                                                  parent_index)
    parent_key = ndb.Key("LinkList", parent_key_string)

    link = ShortLink(parent = parent_key, short_link = short_link_in,
                     target_link = request.target_link,
                     created_date = long(time.time()*1000))
    try:
      link.put()
      deferred.defer(utils.updateMetric, 'create',
                     os.getenv('HTTP_X_APPENGINE_COUNTRY'))
      return CreateShortLinkMessageResponse(status = 0,
                                            short_link = short_link_in,
                                            target_link = request.target_link,
                                            created_date =
                                            long(time.time()*1000))
    except Exception, e:
      logging.info('Error -- failed to create the link')
      logging.exception(e)
      return CreateShortLinkMessageResponse(status = 1,
                                            msg = [('Failed to create the '
                                                   'short link')])

  @endpoints.method(ListShortLinkMessageRequest, ListShortLinkMessageResponse,
                    name='list', path='/list', http_method = 'GET')
  def listShortLinks(self, request):
    """ List all short links.

    Gets all short links from the database.

    Args:
      request: the API request for list

    Returns:
      A message containing a list of short links.
    """
    sl = ShortLink.query().order(-ShortLink.created_date).fetch(request.limit or 20)
    outsl = []
    for link in sl[:]:
      m = ShortLinkMessage(short_link = link.short_link,
                           target_link = link.target_link,
                           created_date = link.created_date)
      outsl.append(m)

    deferred.defer(utils.updateMetric, 'list',
                   os.getenv('HTTP_X_APPENGINE_COUNTRY'))
    return ListShortLinkMessageResponse(short_links = outsl)

  @endpoints.method(ReadShortLinkMessageRequest, ReadShortLinkMessageResponse,
                    name='read', path='/read', http_method = 'GET')
  def readShortLink(self, request):
    """ Read a single short link.

    Gets a short link from the database.

    Args:
      request: the API request for read

    Returns:
      A message containing a short link.
    """
    sl = ShortLink.query(ShortLink.short_link == request.short_link).fetch(1)
    if len(sl) == 0:
      return ReadShortLinkMessageResponse(status = 1,
                                          msg = 'Short link not found')

    deferred.defer(utils.updateMetric, 'read',
                   os.getenv('HTTP_X_APPENGINE_COUNTRY'))
    return ReadShortLinkMessageResponse(status = 0, short_link = sl[0].short_link)

  @endpoints.method(DeleteShortLinkMessageRequest,
                   DeleteShortLinkMessageResponse,
                   name='remove', path='/remove', http_method = 'DELETE')
  def deleteShortLink(self, request):
    """ Delete a single short link.

    Deletes a short link from the datastore.

    Args:
      request: the API request for delete

    Returns:
      A message containing the result
    """

    sl = ShortLink.query(ShortLink.short_link == request.short_link).fetch(1)
    if len(sl) == 0:
      return DeleteShortLinkMessageResponse(status = 1,
                                          msg = 'Short link not found')

    sl[0].key.delete()
    memcache.delete(request.short_link)

    deferred.defer(utils.updateMetric, 'delete',
                   os.getenv('HTTP_X_APPENGINE_COUNTRY'))
    return DeleteShortLinkMessageResponse(short_link = request.short_link, status = 0)


application = endpoints.api_server([ShortLinkApi])

