# MOI VIBARAM Deployment Guide

This guide provides step-by-step instructions to deploy the MOI VIBARAM application to the cloud.

## 0. Is AWS EC2 a Viable Option?

**Yes, but it is more manual.** AWS EC2 gives you a virtual machine (VPS) where you have total control.

*   **Pros**: Full control, industry-standard experience, very scalable.
*   **Cons**: Higher complexity (Security Groups, Key Pairs, SSH), manual maintenance (you handle OS updates), and the "Free Tier" (t2.micro/t3.micro) expires after 12 months.
*   **Verdict**: If you want to learn AWS or need total control, go for it. If you want "push to deploy," stick with Railway or Render.

---

## 1. Database Setup (MongoDB Atlas)

1.  Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
2.  Create a new project and a **FREE Shared Cluster (M0)**.
3.  In **Network Access**, add `0.0.0.0/0` (allow all IP addresses for simplicity, or add specific provider IPs).
4.  In **Database Access**, create a user with a password.
5.  Get your Connection String: `Connect > Drivers > Node.js`.
    *   It will look like: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
    *   Replace `<password>` with your database user password.

---

## 2. Option A: Deployment to Railway.app (Recommended)

Railway is the easiest "all-in-one" option.

1.  Connect your GitHub repository to [Railway.app](https://railway.app/).
2.  **Add Service > GitHub Repo**.
3.  Railway will detect the `docker-compose.yml` or the Dockerfiles.
    *   You can set up two services: one for `/client` and one for `/server`.
4.  **Environment Variables**:
    *   For **Server**:
        *   `PORT=5001`
        *   `MONGO_URI=your_atlas_connection_string`
        *   `JWT_SECRET=generate_a_random_hex`
        *   `CLIENT_URL=https://your-client-url.up.railway.app`
    *   For **Client**:
        *   The client Dockerfile uses Nginx. You might need to update `client/nginx.conf` to point at your Railway backend internal/external URL.

---

## 3. Option B: Render.com (Cheapest Free Tier)

### Backend (Web Service)
1.  **New > Web Service > Connect GitHub**.
2.  **Root Directory**: `server`
3.  **Runtime**: `Docker`
4.  **Environment Variables**: Same as above.

### Frontend (Static Site)
1.  **New > Static Site > Connect GitHub**.
2.  **Root Directory**: `client`
3.  **Build Command**: `npm run build`
4.  **Publish Directory**: `dist`
5.  **Environment Variables**:
    *   If your code uses `import.meta.env.VITE_API_URL`, set it here.

---

## 4. Option C: Vercel (Best for Frontend)

1.  **New Project > Connect GitHub**.
2.  Select the `client` folder.
3.  Vercel will auto-detect Vite. Click **Deploy**.
4.  **Note**: Vercel is for static frontends. You still need to host the backend elsewhere (like Render).

---

## 5. Option D: Deployment to AWS EC2 (Advanced)

If you choose EC2, the easiest way is to use **Docker**.

1.  **Launch Instance**: Select `Ubuntu` (t2.micro/t3.micro for free tier). 
2.  **Security Group**: Open ports `80` (HTTP), `443` (HTTPS), and `5001` (Backend).
3.  **Install Docker**: 
    ```bash
    sudo apt-get update
    sudo apt-get install docker.io -y
    sudo systemctl start docker
    sudo usermod -aG docker $USER
    ```
4.  **Deploy**: 
    *   Clone your repo: `git clone <repo-url>`
    *   Build and run: `docker compose up -d` (if you use docker-compose) or build the Dockerfiles individually.

---

## 6. Security Checklist

*   [ ] Change `JWT_SECRET` to a strong random string.
*   [ ] Ensure `MONGO_URI` is correctly pointing to Atlas, not localhost.
*   [ ] Set `CLIENT_URL` in the backend to your production frontend URL (prevents CORS issues).
*   [ ] Use an **App Password** for Gmail if you are using Nodemailer.
