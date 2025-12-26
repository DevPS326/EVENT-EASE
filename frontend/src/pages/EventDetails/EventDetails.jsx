import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);

  // Load Razorpay SDK manually
  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/events/${id}`);
        setEvent(res.data);
        // Default select first available ticket
        if (res.data.ticketTypes?.length > 0) {
            setSelectedTicket(res.data.ticketTypes[0]);
        }
      } catch (error) {
        console.error("Error fetching event", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  const handlePayment = async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');
    if (!selectedTicket) return alert("Please select a ticket type");

    setBuying(true);
    const isLoaded = await loadRazorpay();
    if (!isLoaded) {
        alert('Razorpay SDK failed to load. Are you online?');
        setBuying(false);
        return;
    }

    try {
        // 1. Create Order
        const orderUrl = "http://localhost:5000/api/payments/order";
        const { data: orderData } = await axios.post(orderUrl, { 
            amount: selectedTicket.price * quantity 
        }, { headers: { Authorization: `Bearer ${token}` } });

        // 2. Open Razorpay Options
        const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_YOUR_KEY_HERE", // Replace with your actual Test Key ID
            amount: orderData.amount,
            currency: "INR",
            name: "EventEase",
            description: `Ticket for ${event.title}`,
            image: "/vite.svg", // Add your logo here
            order_id: orderData.id,
            handler: async function (response) {
                try {
                    // 3. Verify Payment
                    const verifyUrl = "http://localhost:5000/api/payments/verify";
                    await axios.post(verifyUrl, {
                        order_id: response.razorpay_order_id,
                        payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        eventId: event._id,
                        ticketTypeId: selectedTicket._id,
                        amount: selectedTicket.price * quantity
                    }, { headers: { Authorization: `Bearer ${token}` } });

                    alert("Payment Successful! Ticket sent to email.");
                    navigate('/dashboard');
                } catch (error) {
                    console.error("Payment Verify Error", error);
                    alert("Payment verification failed");
                }
            },
            theme: { color: "#7c3aed" }, // Violet color matches your theme
        };

        const rzp = new window.Razorpay(options);
        rzp.open();

    } catch (error) {
        console.error("Payment Error", error);
        alert("Something went wrong with payment initiation.");
    } finally {
        setBuying(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 pt-24 text-center text-white">Loading Event...</div>;
  if (!event) return <div className="min-h-screen bg-slate-950 pt-24 text-center text-white">Event not found.</div>;

  return (
    <div className="min-h-screen bg-slate-950 pt-20 pb-12 relative overflow-hidden">
        {/* Hero Background Image with Blur */}
        <div className="absolute top-0 w-full h-[50vh] z-0">
            <img src={event.imageUrl} className="w-full h-full object-cover opacity-30 blur-sm" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/80 to-slate-950"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                
                {/* LEFT: Event Info */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Title & Image */}
                    <div>
                        <span className="inline-block px-3 py-1 bg-violet-600/20 text-violet-400 rounded-full text-sm font-semibold mb-4 border border-violet-600/30">
                            {event.category}
                        </span>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">{event.title}</h1>
                        <p className="text-slate-400 flex items-center gap-2 text-lg">
                            📅 {new Date(event.date).toLocaleDateString()} at {new Date(event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                        <p className="text-slate-400 flex items-center gap-2 text-lg mt-1">
                            📍 {event.venue}
                        </p>
                    </div>

                    <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
                        <img src={event.imageUrl} alt={event.title} className="w-full h-auto object-cover" />
                    </div>

                    {/* Description */}
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-8">
                        <h3 className="text-2xl font-bold text-white mb-4">About this Event</h3>
                        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{event.description}</p>
                    </div>
                </div>

                {/* RIGHT: Booking Card */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-6">Get Tickets</h3>

                        {/* Ticket Selection */}
                        <div className="space-y-3 mb-6">
                            {event.ticketTypes.map((ticket) => (
                                <div 
                                    key={ticket._id}
                                    onClick={() => setSelectedTicket(ticket)}
                                    className={`cursor-pointer p-4 rounded-xl border transition-all ${selectedTicket?._id === ticket._id ? 'bg-violet-600/20 border-violet-500' : 'bg-slate-950/50 border-slate-800 hover:border-slate-600'}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`font-bold ${selectedTicket?._id === ticket._id ? 'text-white' : 'text-slate-300'}`}>{ticket.name}</span>
                                        <span className="text-white font-bold">₹{ticket.price}</span>
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        {ticket.available > 0 ? `${ticket.available} spots left` : <span className="text-red-500">Sold Out</span>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Quantity Selector */}
                        <div className="flex justify-between items-center mb-6 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                            <span className="text-slate-400">Quantity</span>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-lg bg-slate-800 text-white hover:bg-slate-700">-</button>
                                <span className="text-white font-bold w-4 text-center">{quantity}</span>
                                <button onClick={() => setQuantity(q => q + 1)} className="w-8 h-8 rounded-lg bg-slate-800 text-white hover:bg-slate-700">+</button>
                            </div>
                        </div>

                        {/* Total & Button */}
                        <div className="border-t border-slate-800 pt-4 mb-4">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-slate-300">Total Amount</span>
                                <span className="text-2xl font-bold text-white">₹{(selectedTicket?.price || 0) * quantity}</span>
                            </div>
                            <button 
                                onClick={handlePayment}
                                disabled={buying || selectedTicket?.available <= 0}
                                className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {buying ? 'Processing...' : selectedTicket?.available <= 0 ? 'Sold Out' : 'Book Now'}
                            </button>
                        </div>
                        <p className="text-xs text-center text-slate-500">Secure payments by Razorpay</p>
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
};

export default EventDetails;