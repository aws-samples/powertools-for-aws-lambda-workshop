import type { PreSignUpTriggerEvent, Context, Callback } from 'aws-lambda';

export const handler = (
  event: PreSignUpTriggerEvent,
  _context: Context,
  callback: Callback
) => {
  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;
  callback(null, event);
};
