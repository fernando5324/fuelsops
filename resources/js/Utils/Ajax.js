import axios from 'axios';

const http = axios.create();

http.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

export default http;

export { http };