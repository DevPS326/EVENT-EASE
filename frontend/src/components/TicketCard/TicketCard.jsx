import React from 'react';

const TicketCard = ({ ticket }) => {
    return (
        <div className={styles.ticketCard}>
            <h3 className={styles.eventTitle}>{ticket.event.title}</h3>
            <p><strong>Ticket ID:</strong> {ticket.ticketId}</p>
            <p><strong>Date:</strong> {new Date(ticket.event.date).toLocaleString()}</p>
            <p><strong>Venue:</strong> {ticket.event.venue}</p>
            <p><strong>Ticket Type:</strong> {ticket.ticketType.name}</p>
            <p><strong>Price:</strong> ${ticket.price}</p>
            <div className={styles.qrCodeContainer}>
                <h4>QR Code:</h4>
                <img src={ticket.qrCode} alt="QR Code" className={styles.qrCodeImage} />
            </div>
        </div>
    );
};

export default TicketCard;

