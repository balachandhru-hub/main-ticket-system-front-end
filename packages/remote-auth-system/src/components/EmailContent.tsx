import React, { useState } from 'react';
import './EmailContent.css';
import BackButton from './BackButton';



interface EmailTemplate {
  id: string;
  subject: string;
  body: string;
}

const initialTemplates: EmailTemplate[] = [
  {
    id: 'welcome',
    subject:   "Welcome to Ariba Global Support - Your Company Profile is Successfully Registered!",
    body: `Hi Infosys,
Thank you for registering your company with Ariba Global Support! We're excited to have you on board.

You now have access to our support platform where you can:
- Explore our service plans
- Configure support modules
- Track your tickets and performance

If you haven’t chosen a service plan yet, you can do so by logging into your dashboard.

Need help getting started? Feel free to reach out or visit our help center.
    
Warm regards,
The Ariba Global Support Team`,
  },
  {
    id: 'pay-as-you-go',
    subject:   "You're Now Subscribed to the Pay As You Use Plan",
    body: `Hi Infosys,
You've successfully activated the Pay As You Use plan on your Ariba Global Support account.
    
Here's a quick summary:
- CR Beyond 8 Hours: $25 per hour
- Charge Per Ticket: $500

This flexible plan is perfect for teams who want to pay only when they use our services.

Let us know if you'd like to customize your usage or need help managing your support workflow.

Best,
The Ariba Global Support Team`,
  },
  {
    id: 'subscription',
    subject:   "You're Now on the Subscription Plan – Let's Get Started",
    body: `Hi Infosys,
    You've successfully subscribed to our Subscription Plan. Here's what's included:
    - Number of Consultants: 1
    - Monthly Hours: 176
    - Resource Cost: $176
    This plan gives you predictable support hours and consistent access to a dedicated consultant.
    If you have any questions about your subscription or need help, we're just an email away.
    Cheers,
    The Ariba Global Support Team`,
  },
  {
    id: 'support-team',
    subject:   "Support Team Plan Activated – We're Ready to Assist",
    body: `Hi Infosys,
Thank you for choosing the Support Team Plan! You're all set up.

Your setup includes:
- 2 Dedicated Resources
- 1 Account Manager
- Resource Cost: $2000
- Manager Cost: $3000
    
We've assigned a specialized team to your account. They'll be available to support your business requirements with speed and consistency.
    
Please feel free to connect with your account manager anytime.
    
Warm regards,
The Ariba Global Support Team`,
  },
  {
    id: 'nda',
    subject:   "Your Non-Disclosure Agreement is Ready – Please Review",
    body: `Hi Infosys,
Thank you for reviewing and signing the Non-Disclosure Agreement (NDA).
    
We're pleased to inform you that your signed NDA has been successfully processed and attached to this email for your records.
    
This document is now securely stored in our system and serves as part of our mutual agreement for confidentiality.
    
If you have any further questions or need assistance, feel free to reach out to our support team.
    
Warm regards,
The Ariba Global Support Team`,
  },
];

const EmailContent: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');

  const toggle = (id: string) => {
    setOpenId(prev => (prev === id ? null : id));
    if (editId !== id) setEditId(null); // Close editing if switching
  };

  const startEditing = (template: EmailTemplate) => {
    setEditId(template.id);
    setEditedSubject(template.subject);
    setEditedBody(template.body);
  };

  const saveChanges = (id: string) => {
    setTemplates(prev =>
      prev.map(template =>
        template.id === id
          ? { ...template, subject: editedSubject, body: editedBody }
          : template
      )
    );
    setEditId(null);
  };

  return (
  
    <div >
      <div className="email-config-back-btn">
      <BackButton/>
      </div>
      <div className='header-container'>
      <h1 className="header">Email Content</h1>
      </div>
<div className="Main-email-body">
  <div className="centered-content-container">
<div className="email-wrapper">
      {templates.map((template) => (
        <div className = 'main-email-block'>
        

        <div key={template.id} className="email-block">
          <button className="subject-bar" onClick={() => toggle(template.id)}>
            <span >Subject: {template.subject}</span>
       
           <span className="plus-sign"  >{openId === template.id ? '-' : '+'}</span>
          </button>

          {openId === template.id && (
            <div className="email-body">
              {editId === template.id ? (
                <>
                  <input 
                    type="text"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}

                  />
                  <textarea 
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                  />
                </>
              ) : (
                <>
                  <pre className='content'>{template.body}</pre>
                </>
              )}

              <div className="actions">
  <button
    className="edit-btn"
    onClick={() => startEditing(template)}
    disabled={editId === template.id}
    style={{ opacity: editId === template.id ? 0.5 : 1 }}
  >
    ✏️ Edit
  </button>

  <button
    className="save-btn"
    onClick={() => saveChanges(template.id)}
    disabled={editId !== template.id}
    style={{ opacity: editId !== template.id ? 0.5 : 1 }}
  >
    💾 Save
  </button>
</div>

            </div>
          )}
        </div>
        </div>
        
      ))}
             <div className="navigation-buttons">
  <button id="prevBtn">Previous</button>
  <button id="nextBtn">Next</button>
</div>

    </div>
    </div>
   </div>


    </div>


  );
};

export default EmailContent;
