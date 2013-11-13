from protorpc import messages
from protorpc import message_types

class CreateShortLinkMessageRequest(messages.Message):
  """ Request message to create a short link. """
  short_link = messages.StringField(1)
  target_link = messages.StringField(2, required=True)


class CreateShortLinkMessageResponse(messages.Message):
  """ Response message containing result of short link creation. """
  status = messages.IntegerField(1, required=True)
  short_link = messages.StringField(2)
  target_link = messages.StringField(3)
  created_date = messages.IntegerField(4)
  msg = messages.StringField(5, repeated=True)


class ListShortLinkMessageRequest(messages.Message):
  """ Request message to list short links. """
  limit = messages.IntegerField(1)


class ShortLinkMessage(messages.Message):
  """ Message containing short link information. """
  short_link = messages.StringField(1, required=True)
  target_link = messages.StringField(2, required=True)
  created_date = messages.IntegerField(3)


class ListShortLinkMessageResponse(messages.Message):
  """ Response message with list of short links. """
  short_links = messages.MessageField(ShortLinkMessage, 1, repeated=True)


class ReadShortLinkMessageRequest(messages.Message):
  """ Request message to read a short link. """
  short_link = messages.StringField(1, required=True)


class ReadShortLinkMessageResponse(messages.Message):
  """ Response message to read a short link. """
  status = messages.IntegerField(1, required=True)
  short_link = messages.StringField(2)
  msg = messages.StringField(3)


class DeleteShortLinkMessageRequest(messages.Message):
  """ Request message to delete a short link. """
  short_link = messages.StringField(1, required=True)


class DeleteShortLinkMessageResponse(messages.Message):
  """ Request message to delete a short link. """
  status = messages.IntegerField(1, required=True)
  short_link = messages.StringField(2)
  msg = messages.StringField(3)
