import {useState} from "react";
import {Link} from "react-router-dom";
import API from "../services/api";


function Login(){

const [username,setUsername]=useState("");
const [password,setPassword]=useState("");
const [success,setSuccess]=useState(false);


const login=async()=>{

try{

const res = await API.post(
"/token/",
{
username,
password
}
);


localStorage.setItem(
"access",
res.data.access
);


setSuccess(true);


}
catch(error){

alert("Invalid Login");

}

};



return(

<div>

<h1>BudgetBuddy Login</h1>


<input
placeholder="Username"
onChange={(e)=>setUsername(e.target.value)}
/>


<br/><br/>


<input
type="password"
placeholder="Password"
onChange={(e)=>setPassword(e.target.value)}
/>


<br/><br/>


<button onClick={login}>
Login
</button>


<br/>


<Link to="/register">
Create Account
</Link>



{
success &&

<div>

<h3>Authentication Successful ✅</h3>

<h3>
Username : {username}
</h3>


<h3>
Password : {"*".repeat(password.length)}
</h3>


<h3>
JWT Token Generated ✅
</h3>

</div>

}


</div>

);

}


export default Login;