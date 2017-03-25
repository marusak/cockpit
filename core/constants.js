/* global welderApiHost */
/* *
  Application Constants
 */

const constants = {
  // These are placeholders
  get_apps_url : './json/apps.json',
  get_projects_url: './json/projects.json',
  get_users_url: './json/users.json',

  // BDCS API paths
  get_recipes_list: '/api/v0/recipes/list',
  get_recipes_info: '/api/v0/recipes/info/',
  get_recipes_deps: '/api/v0/recipes/depsolve/',
  get_modules_list: '/api/v0/modules/list',
  get_projects_info: '/api/v0/projects/info/',
  get_modules_info: '/api/v0/modules/info/',
  get_compose_types: '/api/v0/compose/types',
  post_recipes_new: '/api/v0/recipes/new',

};


export default constants;
