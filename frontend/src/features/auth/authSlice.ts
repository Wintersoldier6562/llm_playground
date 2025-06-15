import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { auth } from '../../services/api';

interface User {
  id?: string;
  email?: string;
  full_name?: string;
  is_active?: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await auth.login(email, password);
      console.log("response", response);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      return response.user;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Login failed. Please try again.');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async ({ email, password, full_name }: { email: string; password: string; full_name?: string }, { rejectWithValue }) => {
    try {
      const response = await auth.register(email, password, full_name);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      return response.user;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Registration failed. Please try again.');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('access_token');
    if (token) {
      await auth.logout();
    }
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Logout failed. Please try again.');
  } finally {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
});

export const fetchUserDetails = createAsyncThunk(
  'auth/fetchUserDetails',
  async (_, { rejectWithValue }) => {
    try {
      const user = await auth.me();
      return user;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch user details');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthFromStorage(state) {
      const token = localStorage.getItem('access_token');
      if (token) {
        state.isAuthenticated = true;
      } else {
        state.isAuthenticated = false;
        state.user = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.fulfilled, (state, action: PayloadAction<User>) => {
        state.isAuthenticated = true;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(login.rejected, (state, action: any) => {
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<User>) => {
        state.isAuthenticated = true;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(register.rejected, (state, action: any) => {
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.error = null;
      })
      .addCase(logout.rejected, (state, action: any) => {
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload;
      })
      .addCase(fetchUserDetails.fulfilled, (state, action: PayloadAction<User>) => {
        state.user = action.payload;
        state.error = null;
      })
      .addCase(fetchUserDetails.rejected, (state, action: any) => {
        state.error = action.payload;
      });
  },
});

export const { setAuthFromStorage } = authSlice.actions;
export default authSlice.reducer; 