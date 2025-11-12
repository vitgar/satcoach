# Security Guidelines for SAT Coach

## ⚠️ IMPORTANT: API Key Security

### OpenAI API Key Protection

Your OpenAI API key is **highly sensitive** and should be protected at all times:

1. **Never commit API keys to version control**
   - The `.gitignore` file is configured to exclude all `.env` files
   - Always double-check before committing

2. **Rotate keys if exposed**
   - If an API key is accidentally exposed (e.g., in a commit, screenshot, or public message), rotate it immediately
   - Go to OpenAI dashboard → API Keys → Revoke old key → Create new key

3. **Use environment variables**
   - API keys should only be stored in `.env` files locally
   - On Vercel, use environment variables in the dashboard

4. **Set up usage limits**
   - Configure spending limits in OpenAI dashboard
   - Set up email alerts for usage thresholds
   - Recommended: Start with $10/month limit for testing

5. **Monitor usage**
   - Regularly check OpenAI usage dashboard
   - Review logs for suspicious activity
   - Track costs per feature

## Environment Variables Management

### Local Development
- Copy `.env.example` to `.env` in each package
- Fill in your actual credentials
- Never commit `.env` files

### Production (Vercel)
- Add environment variables in Vercel dashboard
- Use different keys for staging and production
- Enable "Encrypt" option for sensitive values

## MongoDB Security

1. **Connection String Protection**
   - Never expose MongoDB connection strings
   - Use IP whitelisting in MongoDB Atlas
   - Create separate users for dev/staging/prod

2. **User Permissions**
   - Use principle of least privilege
   - App user should only have read/write on app database
   - Never use admin credentials in application

## JWT Security

1. **Secret Keys**
   - Use strong, random secrets (minimum 32 characters)
   - Different secrets for dev/staging/prod
   - Rotate secrets periodically

2. **Token Storage**
   - Use HTTP-only cookies when possible
   - Never store tokens in localStorage if avoidable
   - Implement token refresh mechanism

## Vercel Deployment Security

1. **Environment Variables**
   - Add all secrets in Vercel dashboard
   - Use separate values for preview vs production
   - Enable "Sensitive" flag for secrets

2. **Deployment Protection**
   - Enable Vercel Authentication for preview deployments
   - Use environment variable encryption
   - Review deployment logs regularly

## Security Checklist

### Before First Commit
- [ ] `.gitignore` includes `.env` files
- [ ] No API keys in code
- [ ] `.env.example` files have placeholders only

### Before Deployment
- [ ] All environment variables set in Vercel
- [ ] OpenAI usage limits configured
- [ ] MongoDB IP whitelist configured
- [ ] JWT secrets are strong and unique
- [ ] CORS origins properly configured

### Regular Maintenance
- [ ] Review OpenAI usage weekly
- [ ] Check MongoDB access logs
- [ ] Rotate secrets quarterly
- [ ] Update dependencies for security patches

## Incident Response

If you suspect a security breach:

1. **Immediately rotate all credentials**:
   - OpenAI API key
   - MongoDB connection credentials
   - JWT secrets

2. **Review logs**:
   - Check OpenAI usage for anomalies
   - Review MongoDB access logs
   - Check Vercel deployment logs

3. **Update application**:
   - Deploy with new credentials
   - Monitor for continued suspicious activity

4. **Document**:
   - Record what happened
   - Note any unusual patterns
   - Update security procedures

## Contact

For security concerns, please review this document first, then consult the development team.

---

**Remember**: Security is everyone's responsibility. When in doubt, err on the side of caution.

