import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('admin');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? `${API}/auth/login` : `${API}/auth/register`;
      const payload = isLogin ? { email, password } : { email, password, role };
      
      const response = await axios.post(endpoint, payload);
      
      onLogin(response.data.token, response.data.user);
      toast.success(isLogin ? 'Logged in successfully' : 'Account created successfully');
      
      if (response.data.user.role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/scanner');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" 
         style={{
           backgroundImage: 'url(https://customer-assets.emergentagent.com/job_venuepass-1/artifacts/79dfg0ta_image0.jpeg)',
           backgroundSize: 'cover',
           backgroundPosition: 'center'
         }}>
      <div className="absolute inset-0 bg-black/60" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-[#121212]/80 border-2 border-[#333] p-8 md:p-12">
          <h1 className="concert-heading text-5xl md:text-7xl text-[#FF0000] mb-2 text-center" data-testid="login-heading">
            VENUEPASS
          </h1>
          <p className="text-center text-[#888] uppercase tracking-widest text-xs mb-8 font-mono">Concert Ticketing System</p>
          
          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            <div>
              <label className="block text-sm uppercase tracking-wider mb-2 text-[#888] font-mono">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="retro-input"
                placeholder="your@email.com"
                required
                data-testid="email-input"
              />
            </div>
            
            <div>
              <label className="block text-sm uppercase tracking-wider mb-2 text-[#888] font-mono">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="retro-input"
                placeholder="••••••••"
                required
                data-testid="password-input"
              />
            </div>
            
            {!isLogin && (
              <div>
                <label className="block text-sm uppercase tracking-wider mb-2 text-[#888] font-mono">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="retro-input"
                  data-testid="role-select"
                >
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="retro-button w-full"
              data-testid="submit-button"
            >
              {loading ? 'PROCESSING...' : (isLogin ? 'LOG IN' : 'REGISTER')}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#FF0000] hover:text-[#CC0000] uppercase text-sm tracking-wider transition-colors"
              data-testid="toggle-auth-mode"
            >
              {isLogin ? 'Need an account? Register' : 'Have an account? Log In'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}