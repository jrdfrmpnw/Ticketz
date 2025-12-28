import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Ticket, BarChart3 } from 'lucide-react';

export default function EventDetails({ token }) {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState(null);
  const [email, setEmail] = useState('');
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEventDetails();
  }, []);

  const fetchEventDetails = async () => {
    try {
      const [eventRes, statsRes] = await Promise.all([
        axios.get(`${API}/events/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/events/${eventId}/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setEvent(eventRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTickets = async (e) => {
    e.preventDefault();
    setGenerating(true);

    try {
      await axios.post(`${API}/tickets/generate`, {
        event_id: eventId,
        recipient_email: email,
        count: parseInt(count)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`${count} ticket(s) generated and sent to ${email}`);
      setEmail('');
      setCount(1);
      fetchEventDetails(); // Refresh stats
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate tickets');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-[#FF0000] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid-bg">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
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
          className="bg-[#121212]/80 border-2 border-[#333] p-8 md:p-12 mb-8"
        >
          <h1 className="concert-heading text-4xl md:text-6xl text-[#FF0000] mb-4" data-testid="event-name">{event.name}</h1>
          <p className="text-[#888] text-lg">{event.venue}</p>
          <p className="text-[#888] font-mono">{event.date} at {event.time}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#121212]/80 border border-[#333] p-8"
          >
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 size={24} className="text-[#FF0000]" />
              <h2 className="text-2xl font-bold uppercase">Statistics</h2>
            </div>
            
            <div className="space-y-6">
              <div className="border-b border-[#333] pb-4">
                <div className="text-[#888] text-sm uppercase tracking-wider mb-2">Total Generated</div>
                <div className="text-4xl font-bold font-mono text-[#FF0000]" data-testid="total-generated">{stats.total_generated}</div>
              </div>
              
              <div className="border-b border-[#333] pb-4">
                <div className="text-[#888] text-sm uppercase tracking-wider mb-2">Total Scanned</div>
                <div className="text-4xl font-bold font-mono text-[#FF00FF]" data-testid="total-scanned">{stats.total_scanned}</div>
              </div>
              
              <div>
                <div className="text-[#888] text-sm uppercase tracking-wider mb-2">Unused Tickets</div>
                <div className="text-4xl font-bold font-mono text-[#00FFFF]" data-testid="unused-tickets">{stats.unused}</div>
              </div>
            </div>
          </motion.div>

          {/* Generate Tickets */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#121212]/80 border border-[#333] p-8"
          >
            <div className="flex items-center gap-2 mb-6">
              <Ticket size={24} className="text-[#FF0000]" />
              <h2 className="text-2xl font-bold uppercase">Generate Tickets</h2>
            </div>

            <form onSubmit={handleGenerateTickets} className="space-y-6" data-testid="generate-tickets-form">
              <div>
                <label className="block text-sm uppercase tracking-wider mb-2 text-[#888] font-mono">
                  <Mail size={16} className="inline mr-2" />
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="retro-input"
                  placeholder="attendee@email.com"
                  required
                  data-testid="recipient-email-input"
                />
              </div>

              <div>
                <label className="block text-sm uppercase tracking-wider mb-2 text-[#888] font-mono">Number of Tickets</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  className="retro-input"
                  required
                  data-testid="ticket-count-input"
                />
              </div>

              <button
                type="submit"
                disabled={generating}
                className="retro-button w-full"
                data-testid="generate-button"
              >
                {generating ? 'GENERATING...' : 'GENERATE & SEND'}
              </button>
            </form>

            <div className="mt-6 p-4 bg-[#1E1E1E] border border-[#333]">
              <p className="text-xs text-[#888] uppercase tracking-wider">
                Tickets will be sent via email with QR codes. Each ticket can only be scanned once.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}