import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthService } from '../../services/authService';

function ProtectedRoute() {
    const authService = new AuthService(localStorage);
    const isAuthenticated = authService.getToken();
    console.log('token?',isAuthenticated)
    return isAuthenticated ? <Outlet /> : <Navigate to="/auth/login" />;
}

export {ProtectedRoute};
