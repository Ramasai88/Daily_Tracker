import { supabase } from './supabaseClient.js';

// DOM Elements
const form = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const passwordGroup = document.getElementById('password-group');
const confirmPasswordGroup = document.getElementById('confirm-password-group');
const submitBtn = document.getElementById('submit-btn');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoader = submitBtn.querySelector('.btn-loader');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');
const formTitle = document.getElementById('form-title');
const formSubtitle = document.getElementById('form-subtitle');
const toggleText = document.getElementById('toggle-text');
const toggleBtn = document.getElementById('toggle-btn');

// State
let isSignupMode = false;

// Check if user is already logged in
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  window.location.href = 'index.html';
}

// Toggle between login and signup
toggleBtn.addEventListener('click', () => {
  isSignupMode = !isSignupMode;
  
  if (isSignupMode) {
    formTitle.textContent = 'Create Account';
    formSubtitle.textContent = 'Sign up to start tracking your tasks';
    submitBtn.querySelector('.btn-text').textContent = 'Sign Up';
    toggleText.innerHTML = `Already have an account? <button type="button" class="link-btn" id="toggle-btn">Login</button>`;
    confirmPasswordGroup.style.display = 'flex';
  } else {
    formTitle.textContent = 'Welcome Back';
    formSubtitle.textContent = 'Login to continue to your dashboard';
    submitBtn.querySelector('.btn-text').textContent = 'Login';
    toggleText.innerHTML = `Don't have an account? <button type="button" class="link-btn" id="toggle-btn">Sign up</button>`;
    confirmPasswordGroup.style.display = 'none';
  }
  
  // Clear messages
  hideMessages();
  
  // Re-attach event listener to new toggle button
  document.getElementById('toggle-btn').addEventListener('click', toggleBtn.click);
});

// Handle form submission
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  
  // Clear previous messages
  hideMessages();
  
  // Validate
  if (!email || !password) {
    showError('Please fill in all fields');
    return;
  }
  
  if (isSignupMode && password !== confirmPassword) {
    showError('Passwords do not match');
    return;
  }
  
  if (password.length < 6) {
    showError('Password must be at least 6 characters');
    return;
  }
  
  // Set loading state
  setLoading(true);
  
  try {
    if (isSignupMode) {
      // Sign up
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + '/index.html'
        }
      });
      
      if (error) throw error;
      
      if (data.user) {
        showSuccess('Account created! Please check your email to verify your account.');
        // Switch to login mode after successful signup
        setTimeout(() => {
          toggleBtn.click();
        }, 2000);
      }
    } else {
      // Login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      // Redirect to index
      window.location.href = 'index.html';
    }
  } catch (error) {
    console.error('Auth error:', error);
    
    // Handle specific error messages
    if (error.message.includes('Invalid login credentials')) {
      showError('Invalid email or password');
    } else if (error.message.includes('User already registered')) {
      showError('This email is already registered');
    } else if (error.message.includes('Email not confirmed')) {
      showError('Please check your email to confirm your account');
    } else {
      showError(error.message || 'An error occurred. Please try again.');
    }
  } finally {
    setLoading(false);
  }
});

// Helper functions
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('show');
  successMessage.classList.remove('show');
}

function showSuccess(message) {
  successMessage.textContent = message;
  successMessage.classList.add('show');
  errorMessage.classList.remove('show');
}

function hideMessages() {
  errorMessage.classList.remove('show');
  successMessage.classList.remove('show');
}

function setLoading(loading) {
  if (loading) {
    submitBtn.classList.add('loading');
    btnText.style.visibility = 'hidden';
    btnLoader.style.display = 'inline-flex';
    submitBtn.disabled = true;
  } else {
    submitBtn.classList.remove('loading');
    btnText.style.visibility = 'visible';
    btnLoader.style.display = 'none';
    submitBtn.disabled = false;
  }
}
