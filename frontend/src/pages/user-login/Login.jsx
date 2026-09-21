import React,{ useState } from 'react'
import useLoginStore from '../../store/useLoginStore'
import countries from '../../utils/countries.js'
import * as yup from 'yup'
import {yupResolver} from '@hookform/resolvers/yup'

const LoginValidationSchema = yup.object().shape({
  phoneNumber: yup
    .string()
    .nullable()
    .notRequired()
    .matches(/^\d+$/, "Phone Number must be digits")
    .transform((value, originalValue) => {
      originalValue.trim() === "" ? null : value
    }),
  email: yup
    .string()
    .nullable()
    .notRequired()
    .email("Please enter valid email")
    .transform((value, originalValue) => {
      originalValue.trim() === "" ? null : value
    }).test(
      "at-least-one",
      "either email or phone number is required",
      function(value) {
        return !!(value.phoneNumber || value.email)
      }
    )
})

const Login = () => {
  const {step, setStep, setUserPhoneData, userPhoneData, resetLoginState} = useLoginStore();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");

  return (
    <div>Login</div>
  )
}

export default Login