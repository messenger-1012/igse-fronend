/* eslint-disable no-underscore-dangle */
import { message } from 'antd';
import axios from 'axios';
import tokenFunctions from './token';

const API = process.env.REACT_APP_PUBLIC_URL;
const axiosApiInstance = axios.create({
  baseURL: API,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

axiosApiInstance.interceptors.request.use(
  async (config) => {
    const token = await tokenFunctions.getLocalAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

axiosApiInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const user = JSON.parse(localStorage.getItem('user'));
    if (error.response.data.message === 'jwt expired' && user?.refreshToken && error.response.data.message !== 'Login Expired') {
      if (!originalRequest._retried) {
        originalRequest._retried = true;
        return axios.post(`${API}/api/auth/verify-user`, {
          refreshToken: await tokenFunctions.getRefreshToken(),
        })
          .then(async (response) => {
            await tokenFunctions.updateLocalAccessToken(response.data.accessToken);
            originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
            return axiosApiInstance(originalRequest);
          })
          .catch((err) => {
            message.error('login Expired');
            localStorage.removeItem('user');
            return Promise.reject(err);
          });
      }
    }
    return Promise.reject(error);
  },
);
export default axiosApiInstance;
