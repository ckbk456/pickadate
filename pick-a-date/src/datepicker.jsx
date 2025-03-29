import React, { useState } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';
import "./css/datepicker.css"

function DatePickerApp(){
    const [value, setValue] = useState(dayjs(new Date()));
    return (
        
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
        <div class="container">
            <h1 class="subtitle" id="datePickerSubtitle"> Lựa một ngày đê bạn êii </h1>
            <div class = "datePickerWidget">
                <DatePicker
                label="Pick a date"
                value={value}
                onChange={(newValue) => {
                setValue(newValue);
            }}
            />
            </div> 
        </div> 
      </LocalizationProvider>
    );
  }

export default DatePickerApp