import { combineReducers } from 'redux';
import states from './states';
import recipes from './recipes';
import recipePage from './recipePage';
import inputs from './inputs';
import modals from './modals';
import rehydrated from './rehydrated';

const rootReducer = combineReducers({
  states,
  recipes,
  recipePage,
  inputs,
  modals,
  rehydrated,
});

export default rootReducer;
