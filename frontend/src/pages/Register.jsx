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


alert("Account Created Successfully ✅");


}


catch(error){

alert("Registration Failed");

}


}



return(

<div className="auth-container">


<div className="auth-card">


<div className="logo">

📝

</div>


<h1>

Create Account

</h1>



<input

placeholder="Username"

onChange={(e)=>setUsername(e.target.value)}

/>



<input

placeholder="Email"

onChange={(e)=>setEmail(e.target.value)}

/>



<input

type="password"

placeholder="Password"

onChange={(e)=>setPassword(e.target.value)}

/>



<button onClick={register}>

Register

</button>



<br/><br/>


<Link to="/">

⬅ Back To Login

</Link>



</div>


</div>

)

}


export default Register;