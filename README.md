##  Overview & Live Demo

Prism is an AI-powered event photo gallery that simplifies photo sharing using facial recognition. Instead of scrolling through hundreds of event photos, guests can seamlessly find all their pictures in seconds.

>  [You can use using this Amplify Link for accessing PRISM](https://main.dojil56ixso65.amplifyapp.com)

---

##  How to Use

Prism provides two distinct user experiences tailored for secure event management and frictionless guest access.

* **Host Authentication:** Event organizers log in via AWS Cognito to access their personalized dashboard.
* **Room Management:** Hosts generate unique event rooms and upload bulk event photos directly to S3.
* **Guest Access:** Attendees navigate to the shared link and enter the unique room code to obtain a secure JWT session.
* **Smart Search:** Guests upload a single reference selfie to query Amazon Rekognition, instantly retrieving all photos they appear in.

---

##  Tech Stack & Structure

The repository is modularized into two distinct ecosystems for front-end presentation and back-end logic.

* **Frontend Ecosystem:** Built with React, Vite, and Tailwind CSS, featuring dedicated contexts, hooks, and pages.
* **Backend Infrastructure:** Deployed via AWS CloudFormation/SAM using Python 3.11 Lambda handlers.
* **Data & Storage:** Amazon DynamoDB (NoSQL data), Amazon S3 (image storage), and Amazon Rekognition (facial analysis).
* **Security Layer:** AWS Cognito User Pools (Hosts) and API Gateway Lambda Authorizers (Guests).

---



##  Architecture & Diagrams

Prism leverages a robust, event-driven AWS Serverless architecture to handle image processing and user traffic at scale. Reference the included diagrams for a deep dive into the system design:

* **System Architecture (HLD):** Illustrates the API Gateway, Lambda compute layer, and DynamoDB storage layout

    <img width="1024" height="559" alt="image" src="https://github.com/user-attachments/assets/b50b091f-ad00-429c-ace0-66eac6b31e6a" />
 
---

* **Authentication Flow:** Details the distinct AWS Cognito setup for hosts and custom JWT authorization for guests.


    <img width="1024" height="559" alt="image" src="https://github.com/user-attachments/assets/3befc9a2-2113-42fb-9406-b9ca3997f210" />
    
---
* **Data Interactions (LLD):** Showcases cascading deletes and synchronized DynamoDB updates across tables


    <img width="507" height="1024" alt="image" src="https://github.com/user-attachments/assets/c8a8a103-2b85-45ae-a544-a446a97861e4" />

---
* **Async Workflows (LLD):** Maps the automated S3 object creation triggers to Amazon Rekognition indexing:

    <img width="507" height="1024" alt="image" src="https://github.com/user-attachments/assets/545c7c7b-3149-4d42-bdc0-63e85f285a0b" />



---

