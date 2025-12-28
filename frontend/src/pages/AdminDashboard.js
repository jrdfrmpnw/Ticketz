import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Users, TrendingUp, LogOut, Plus, Trash2 } from 'lucide-react';

export default function AdminDashboard({ token, user, onLogout }) {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API}/events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(response.data);
      
      // Fetch stats for each event
      const statsPromises = response.data.map(event => 
        axios.get(`${API}/events/${event.event_id}/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      const statsResponses = await Promise.all(statsPromises);
      const statsMap = {};
      statsResponses.forEach(res => {
        statsMap[res.data.event_id] = res.data;
      });
      setStats(statsMap);
    } catch (error) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId, eventName) => {
    try {
      await axios.delete(`${API}/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Event "${eventName}" deleted successfully`);
      setDeleteConfirm(null);
      fetchEvents(); // Refresh the list
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete event');
    }
  };

  return (
    <div className="min-h-screen">
      <div className="grid-bg min-h-screen">
        {/* Header */}
        <div className="bg-[#121212]/80/90 border-b-2 border-[#333]">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="concert-heading text-4xl md:text-6xl text-[#FF0000]" data-testid="dashboard-heading">ADMIN</h1>
                <p className="text-[#888] font-mono text-sm mt-1">{user.email}</p>
              </div>
              <button
                onClick={onLogout}
                className="bg-transparent border-2 border-[#333] text-white uppercase tracking-wider px-6 py-3 hover:border-white hover:text-[#FF0000] transition-all flex items-center gap-2"
                data-testid="logout-button"
              >
                <LogOut size={18} />
                LOGOUT
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold uppercase tracking-tight">Events</h2>
            <button
              onClick={() => navigate('/create-event')}
              className="retro-button flex items-center gap-2"
              data-testid="create-event-button"
            >
              <Plus size={20} />
              CREATE EVENT
            </button>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin h-12 w-12 border-4 border-[#FF0000] border-t-transparent" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[#888] text-lg">No events yet. Create your first event!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="events-grid">
              {events.map((event, idx) => {
                const eventStats = stats[event.event_id] || {};
                return (
                  <motion.div
                    key={event.event_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => navigate(`/events/${event.event_id}`)}
                    className="bg-[#121212]/80 border border-[#333] p-6 hover:border-[#FF0000]/50 transition-colors cursor-pointer group"
                    data-testid={`event-card-${event.event_id}`}
                  >
                    <h3 className="text-2xl font-bold uppercase mb-4 group-hover:text-[#FF0000] transition-colors">
                      {event.name}
                    </h3>
                    
                    <div className="space-y-2 text-sm text-[#888]">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-[#FF0000]" />
                        <span>{event.venue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-[#FF0000]" />
                        <span>{event.date} at {event.time}</span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#333] grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[#888] text-xs uppercase tracking-wider mb-1">Generated</div>
                        <div className="text-2xl font-bold font-mono text-[#FF0000]">{eventStats.total_generated || 0}</div>
                      </div>
                      <div>
                        <div className="text-[#888] text-xs uppercase tracking-wider mb-1">Scanned</div>
                        <div className="text-2xl font-bold font-mono text-[#FF00FF]">{eventStats.total_scanned || 0}</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}