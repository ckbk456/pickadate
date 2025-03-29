import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Header from './header.jsx'
import DatePickerApp from './datepicker.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Header/>
    <div class="datePickerContainer">
      <DatePickerApp/>
    </div>
    
  </StrictMode>,
)
