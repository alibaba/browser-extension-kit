import { RuntimeContext } from '../types';
import Connect from '../util/connectHook';

const connect = new Connect(RuntimeContext.popup);

/**
 * React hooks to subscribe messages.
 * @param id message id
 * @param initialValue initial value
 */
export const useMessage = connect.useMessage.bind(connect);

export const useFrame = connect.useFrame.bind(connect);

/**
 * React hooks to send message or manualy subscribe to a message
 */
export const usePostMessage = connect.usePostMessage.bind(connect);
