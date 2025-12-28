import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function CreateEvent({ token }) {
  const [formData, setFormData] = useState({
    name: '',
    venue: '',
    date: '',
    time: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/events`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Event created successfully');
      navigate(`/events/${response.data.event_id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid-bg">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-12">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-[#FF0000] hover:text-[#CC0000] transition-colors mb-8"
          data-testid="back-button"
        >
          <ArrowLeft size={20} />
          <span className="uppercase tracking-wider text-sm">Back to Dashboard</span>
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#121212]/80 border-2 border-[#333] p-8 md:p-12"
        >
          <h1 className="concert-heading text-5xl md:text-7xl text-[#FF0000] mb-8" data-testid="create-event-heading">
            CREATE EVENT
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="create-event-form">
            <div>
              <label className="block text-sm uppercase tracking-wider mb-2 text-[#888] font-mono">Event Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="retro-input"
                placeholder="Summer Rock Festival 2025"
                required
                data-testid="event-name-input"
              />
            </div>

            <div>
              <label className="block text-sm uppercase tracking-wider mb-2 text-[#888] font-mono">Venue</label>
              <input
                type="text"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                className="retro-input"
                placeholder="Red Rocks Amphitheatre"
                required
                data-testid="venue-input"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm uppercase tracking-wider mb-2 text-[#888] font-mono">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="retro-input"
                  required
                  data-testid="date-input"
                />
              </div>

              <div>
                <label className="block text-sm uppercase tracking-wider mb-2 text-[#888] font-mono">Time</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="retro-input"
                  required
                  data-testid="time-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="retro-button w-full mt-8"
              data-testid="submit-event-button"
            >
              {loading ? 'CREATING...' : 'CREATE EVENT'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}