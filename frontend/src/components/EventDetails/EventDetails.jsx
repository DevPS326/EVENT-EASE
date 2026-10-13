import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const EventDetails = () => {
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeLeft, setTimeLeft] = useState({});
    const [selectedTicketType, setSelectedTicketType] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const { id } = useParams();
    const navigate = useNavigate();
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    const loadRazorpayScript = () => {
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
                const response = await fetch(`${API_URL}/api/events/${id}`);
                if (!response.ok) throw new Error('Event not found');
                const data = await response.json();
                setEvent(data);
                if (data.ticketTypes && data.ticketTypes.length > 0) {
                    setSelectedTicketType(data.ticketTypes[0]);
                }
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id, API_URL]);

    useEffect(() => {
        if (!event) return;

        const calculateTimeLeft = () => {
            const difference = +new Date(event.date) - +new Date();
            let timeLeft = {};

            if (difference > 0) {
                timeLeft = {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                };
            }
            return timeLeft;
        };

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [event]);

    const displayRazorpay = async () => {
        const res = await loadRazorpayScript();
        if (!res) {
            alert('Razorpay SDK failed to load. Are you online?');
            return;
        }

        if (!selectedTicketType) {
            alert('Please select a ticket type.');
            return;
        }

        const totalAmount = selectedTicketType.price * quantity;

        try {
            const orderResponse = await fetch(`${API_URL}/api/payments/order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({ amount: totalAmount }),
            });
            const orderData = await orderResponse.json();

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'EventEase',
                description: `Ticket for ${event.title}`,
                order_id: orderData.id,
                handler: async function (response) {
                    try {
                        const verifyResponse = await fetch(`${API_URL}/api/payments/verify`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                            },
                            body: JSON.stringify({
                                order_id: response.razorpay_order_id,
                                payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                eventId: event._id,
                                ticketTypeId: selectedTicketType._id,
                                quantity,
                                amount: totalAmount,
                            }),
                        });
                        const verifyData = await verifyResponse.json();
                        if (verifyData.success) {
                            alert('Payment Successful! Ticket purchased.');
                            navigate('/dashboard'); // Or to a ticket confirmation page
                        } else {
                            alert('Payment Verification Failed: ' + verifyData.message);
                        }
                    } catch (error) {
                        console.error('Error during payment verification:', error);
                        alert('Payment verification failed due to a server error.');
                    }
                },
                prefill: {
                    name: 'User Name', // You can prefill user details here
                    email: 'user@example.com',
                },
                theme: {
                    color: '#61dafb',
                },
            };
            const paymentObject = new window.Razorpay(options);
            paymentObject.open();
        } catch (error) {
            console.error('Error creating order:', error);
            alert('Could not initiate payment. Please try again.');
        }
    };

    if (loading) return <div className={styles.message}>Loading...</div>;
    if (error) return <div className={`${styles.message} ${styles.error}`}>{error}</div>;
    if (!event) return null;

    const timerComponents = Object.keys(timeLeft).map((interval) => {
        if (!timeLeft[interval]) {
            return null;
        }
        return (
            <span key={interval} className={styles.countdownItem}>
                {timeLeft[interval]} {interval}{" "}
            </span>
        );
    });

    return (
        <div className={styles.container}>
            <div className={styles.imageContainer}>
                <img src={event.imageUrl} alt={event.title} className={styles.image} />
            </div>
            <div className={styles.content}>
                <h1 className={styles.title}>{event.title}</h1>
                <p className={styles.description}>{event.description}</p>

                <div className={styles.detailsGrid}>
                    <div className={styles.detailItem}>
                        <h3>Date & Time</h3>
                        <p>{new Date(event.date).toLocaleString()}</p>
                    </div>
                    <div className={styles.detailItem}>
                        <h3>Venue</h3>
                        <p>{event.venue}</p>
                    </div>
                    <div className={styles.detailItem}>
                        <h3>Organizer</h3>
                        <p>{event.organizer.name} ({event.organizer.email})</p>
                    </div>
                </div>

                <div className={styles.countdown}>
                    <h3>Event Starts In:</h3>
                    {timerComponents.length ? timerComponents : <span>Event has started!</span>}
                </div>

                <div className={styles.ticketSelection}>
                    <h3>Select Your Ticket</h3>
                    {event.ticketTypes && event.ticketTypes.length > 0 ? (
                        <>
                            <select
                                className={styles.selectTicket}
                                onChange={(e) => {
                                    const selected = event.ticketTypes.find(t => t._id === e.target.value);
                                    setSelectedTicketType(selected);
                                    setQuantity(1); // Reset quantity on ticket type change
                                }}
                                value={selectedTicketType ? selectedTicketType._id : ''}
                            >
                                {event.ticketTypes.map((type) => (
                                    <option key={type._id} value={type._id}>
                                        {type.name} - ${type.price} ({type.available} available)
                                    </option>
                                ))}
                            </select>
                            {selectedTicketType && selectedTicketType.available > 0 && (
                                <div className={styles.quantityControl}>
                                    <label htmlFor="quantity">Quantity:</label>
                                    <input
                                        type="number"
                                        id="quantity"
                                        min="1"
                                        max={selectedTicketType.available}
                                        value={quantity}
                                        onChange={(e) => setQuantity(Math.min(e.target.value, selectedTicketType.available))}
                                        className={styles.quantityInput}
                                    />
                                </div>
                            )}
                            <button
                                className={styles.buyButton}
                                onClick={displayRazorpay}
                                disabled={!selectedTicketType || selectedTicketType.available === 0 || quantity === 0}
                            >
                                Buy Now ({selectedTicketType ? `$${(selectedTicketType.price * quantity).toFixed(2)}` : '$0.00'})
                            </button>
                        </>
                    ) : (
                        <p>No ticket types available for this event.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EventDetails;

