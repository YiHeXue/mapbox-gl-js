// @flow strict
import type {RequestParameters, ResponseCallback} from './ajax';
import type {Cancelable} from "../types/cancelable.js";

/**
 * This method type is used to register a protocol handler.
 * Use the abort controller for aborting requests.
 * Return a promise with the relevant resource response.
 */
export type AddProtocolAction = (requestParameters: RequestParameters, callback: ResponseCallback<any>) => Cancelable;

