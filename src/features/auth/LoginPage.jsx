import React from 'react';
import { Button } from '../../components/button/Button';
import { useNavigate } from 'react-router';

export const Component = () => {
  const navigate = useNavigate();
  return (
    <div>
      <h1>Login Page</h1>
      <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
      <Button onClick={() => navigate('/canvas/1')}>Go to Canvas</Button>
    </div>
  );
};
