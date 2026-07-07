import {useState} from "react";
import {Link} from "react-router-dom";
import API from "../services/api";


function Register(){

const [username,setUsername]=useState("");
const [email,setEmail]=useState("");
const [password,setPassword]=useState("");



const register=async()=>{

try{

await API.post(
"/users/register/",
{
username,
email,
password
}
);


alert("Registration Successful ✅");


}
catch(error){

alert("Registration Failed ❌");

}


};



return(

<div>


<h1>BudgetBuddy Register</h1>


<input
placeholder="Username"
onChange={(e)=>setUsername(e.target.value)}
/>


<br/><br/>


<input
placeholder="Email"
onChange={(e)=>setEmail(e.target.value)}
/>


<br/><br/>


<input
type="password"
placeholder="Password"
onChange={(e)=>setPassword(e.target.value)}
/>


<br/><br/>


<button onClick={register}>
Register
</button>


<br/>


<Link to="/">
Back to Login
</Link>


</div>

);

}


export default Register;